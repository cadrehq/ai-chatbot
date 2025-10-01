import type { ComponentType } from "react";
import { OnlyOfficeDocx } from "@/artifacts/docx/client";
import { Artifact } from "@/components/create-artifact";

const DocxContent: ComponentType<any> = ({ title, content, id }) => (
  <OnlyOfficeDocx
    callbackUrl={`${process.env.NEXT_PUBLIC_APP_URL}/api/onlyoffice/callback`}
    documentKey={id}
    documentTitle={title}
    documentUrl={content}
  />
);

export const docxArtifact = new Artifact({
  kind: "docx",
  description: "Useful for Microsoft Word documents (DOCX).",
  content: DocxContent,
  actions: [],
  toolbar: [],
  onStreamPart: () => {
    console.log("docx stream part");
  },
});
