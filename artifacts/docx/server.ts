import { put } from "@vercel/blob";

import { generateText } from "ai";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { myProvider } from "@/lib/ai/providers";
import { createDocumentHandler } from "@/lib/artifacts/server";

function textToDocxParagraphs(content: string): Paragraph[] {
  const lines = content.split("\n");
  return lines.map(
    (line) =>
      new Paragraph({
        children: [new TextRun(line || " ")], // Use space for empty lines
        spacing: { after: 200 },
      })
  );
}

export const docxDocumentHandler = createDocumentHandler({
  kind: "docx",
  async onCreateDocument({ title }) {
    try {
      // Generate initial document based on title
      const initialPrompt = `Create a professional document with the title "${title}". Generate comprehensive, well-structured content that would be appropriate for this title. Include relevant sections, proper formatting, and substantive content.`;

      const { text: generatedContent } = await generateText({
        model: myProvider.languageModel("artifact-model"),
        prompt: initialPrompt,
        temperature: 0.7,
      });

      // Convert content to DOCX format
      const paragraphs = generatedContent
        ? textToDocxParagraphs(generatedContent)
        : [];
      const doc = new Document({
        sections: [{ properties: {}, children: paragraphs }],
      });

      const buffer = await Packer.toBuffer(doc);
      const filename = `${title.replace(/\s+/g, "_")}_${Date.now()}.docx`;
      const blob = await put(filename, buffer, {
        access: "public",
        addRandomSuffix: false,
        cacheControlMaxAge: 5,
      });

      return blob.url;
    } catch (error) {
      console.error("Error creating document:", error);

      // Fallback: create empty document
      const doc = new Document({
        sections: [{ properties: {}, children: [] }],
      });

      const buffer = await Packer.toBuffer(doc);
      const filename = `${title.replace(/\s+/g, "_")}_${Date.now()}.docx`;
      const blob = await put(filename, buffer, { access: "public" });

      return blob.url;
    }
  },
  async onUpdateDocument({ document, description, dataStream }) {
    try {
      const systemPrompt = `
You are editing a document. Your task is to provide a COMPLETE, FULL document that includes:

The url to the docx ${document.content}

Please provide the COMPLETE document with your suggestions integrated. Do not provide just the changes - provide the entire document with improvements.`;

      const { text: fullDocumentSuggestion } = await generateText({
        model: myProvider.languageModel("artifact-model"),
        system: systemPrompt,
        prompt: description,
        temperature: 0.7,
      });

      // Create/overwrite the document file with the full suggestion
      const paragraphs = textToDocxParagraphs(fullDocumentSuggestion);
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: paragraphs,
          },
        ],
      });

      const buffer = await Packer.toBuffer(doc);

      // Extract filename from original blob URL or use document title
      const url = new URL(document.content || "");
      const pathname = url.pathname;
      const extractedFilename = pathname.split("/").pop();
      const filename =
        extractedFilename ||
        `${document.title?.replace(/\s+/g, "_")}_${Date.now()}.docx`;

      const blob = await put(filename, buffer, {
        access: "public",
        addRandomSuffix: false,
      });

      return blob.url;
    } catch (error) {
      dataStream.write({
        type: "error",
        errorText: "Failed to generate document suggestions. Please try again.",
      });

      return document.content || "";
    }
  },
});
