/** biome-ignore-all lint/suspicious/noEmptyBlockStatements: <explanation> */

import type { ComponentType } from "react";
import { OnlyOfficeDocx } from "@/artifacts/docx/client";
import { Artifact } from "@/components/create-artifact";

const DocxContent: ComponentType<any> = ({ title, content }) => (
  <OnlyOfficeDocx
    callbackUrl={"/api/files/upload"}
    documentKey={Math.random().toString(36).substring(2, 15)}
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
  onStreamPart: () => {},
});
