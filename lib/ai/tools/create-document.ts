import { tool, type UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import {
  artifactKinds,
  documentHandlersByArtifactKind,
} from "@/lib/artifacts/server";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";

type CreateDocumentProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  docxFiles?: string[];
};

export const createDocument = ({
  session,
  dataStream,
  docxFiles,
}: CreateDocumentProps) =>
  tool({
    description:
      "Create a document for writing or content creation activities, or work with uploaded DOCX files for review/editing. When docxFiles are provided, use those files instead of creating new documents and always use kind=docx. This tool will call other functions that will generate contents or process existing documents based on the title and kind.",
    inputSchema: z.object({
      title: z.string(),
      kind: z.enum(artifactKinds),
    }),
    execute: async ({ title, kind }) => {
      const id = generateUUID();

      dataStream.write({
        type: "data-kind",
        data: kind,
        transient: true,
      });

      dataStream.write({
        type: "data-id",
        data: id,
        transient: true,
      });

      dataStream.write({
        type: "data-title",
        data: title,
        transient: true,
      });

      dataStream.write({
        type: "data-clear",
        data: null,
        transient: true,
      });

      const documentHandler = documentHandlersByArtifactKind.find(
        (documentHandlerByArtifactKind) =>
          documentHandlerByArtifactKind.kind === kind
      );

      if (!documentHandler) {
        throw new Error(`No document handler found for kind: ${kind}`);
      }

      // If docxFiles are provided, use them instead of creating new documents
      if (docxFiles && docxFiles.length > 0 && kind === "docx") {
        const uploadedFileUrl = docxFiles[0];

        await documentHandler.onCreateDocument({
          id,
          title,
          dataStream,
          session,
          content: uploadedFileUrl,
        });

        dataStream.write({ type: "data-finish", data: null, transient: true });

        return {
          id,
          title,
          kind,
          content: uploadedFileUrl,
          message:
            "Document uploaded successfully. I can now review it, identify issues, or make edits if you'd like.",
        };
      }

      // Normal document creation flow (no uploaded file)
      await documentHandler.onCreateDocument({
        id,
        title,
        dataStream,
        session,
      });

      dataStream.write({ type: "data-finish", data: null, transient: true });

      return {
        id,
        title,
        kind,
        content: "A document was created and is now visible to the user.",
      };
    },
  });
