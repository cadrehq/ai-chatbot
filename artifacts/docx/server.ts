import { put } from "@vercel/blob";
import { smoothStream, streamText } from "ai";
import { Document, Packer } from "docx";
import { updateDocumentPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import type {
  CreateDocumentCallbackProps,
  UpdateDocumentCallbackProps,
} from "@/lib/artifacts/server";
import { createDocumentHandler } from "@/lib/artifacts/server";
import { markdownToDocxParagraphs } from "@/lib/utils";

export const docxDocumentHandler = createDocumentHandler({
  kind: "docx",
  async onCreateDocument({
    title,
    content,
  }: CreateDocumentCallbackProps & { content?: string }) {
    const paragraphs = content ? markdownToDocxParagraphs(content) : [];
    const doc = new Document({
      sections: [{ properties: {}, children: paragraphs }],
    });
    const buffer = await Packer.toBuffer(doc);
    const filename = `${title.replace(/\s+/g, "_")}_${Date.now()}.docx`;
    const blob = await put(filename, buffer, { access: "public" });
    return blob.url;
  },
  async onUpdateDocument({
    document,
    description,
    dataStream,
  }: UpdateDocumentCallbackProps) {
    // Stream AI deltas to the frontend; let frontend insert into OnlyOffice
    const { fullStream } = streamText({
      model: myProvider.languageModel("artifact-model"),
      system: updateDocumentPrompt(document.content, "docx"),
      experimental_transform: smoothStream({ chunking: "word" }),
      prompt: description,
      providerOptions: {
        openai: {
          prediction: {
            type: "content",
            content: document.content,
          },
        },
      },
    });
    for await (const delta of fullStream) {
      const { type } = delta;
      if (type === "text-delta") {
        const { text } = delta;
        dataStream.write({
          type: "data-textDelta",
          data: text,
          transient: true,
        });
      }
    }
    // No backend docx file creation; frontend handles OnlyOffice updates
    return "streaming-complete";
  },
});
