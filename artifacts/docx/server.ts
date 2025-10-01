import { put } from "@vercel/blob";
import { generateText, generateObject } from "ai";
import { Document, Packer } from "docx";
import mammoth from "mammoth";
import { z } from "zod";
import { myProvider } from "@/lib/ai/providers";
import { createDocumentHandler } from "@/lib/artifacts/server";
import { jsonToDocx } from "@/lib/utils";
import { saveAISuggestions } from "@/lib/db/queries";

export const docxDocumentHandler = createDocumentHandler({
  kind: "docx",
  async onCreateDocument({ title, content }) {
    try {
      if (content) return content;

      // Otherwise, generate a new document
      const initialPrompt = `Create a professional document with the title "${title}". 
    Return the content as a structured JSON array, where each item has:
    - "type" (one of: "heading", "paragraph", "bullet", "table")
    - "content" (string or array of strings for table rows)
    - optional "level" (for heading levels, e.g., 1, 2, 3)
    - optional "style" (e.g., "bold", "italic", "quote")

    Example:
    [
      { "type": "heading", "level": 1, "content": "Introduction" },
      { "type": "paragraph", "content": "This document provides an overview..." },
      { "type": "bullet", "content": ["Key point 1", "Key point 2"] },
      { "type": "table", "content": [["Header1","Header2"], ["Row1","Row2"]] }
    ]
    Return the content strictly as raw JSON. 
    Do not include markdown, code fences, or explanations. Only valid JSON.`;

      const { text: generatedContent } = await generateText({
        model: myProvider.languageModel("artifact-model"),
        prompt: initialPrompt,
      });

      const doc = jsonToDocx(JSON.parse(generatedContent));

      const buffer = await Packer.toBuffer(doc);
      const filename = `${title.replace(/\s+/g, "_")}_${Date.now()}.docx`;
      const blob = await put(filename, buffer, { access: "public" });

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

  async onUpdateDocument({ document, dataStream, session }) {
    try {
      const suggestionSchema = z.array(
        z.object({
          type: z.enum(["comment", "edit"]),
          target: z.string().optional(),
          old: z.string().optional(),
          new: z.string().optional(),
          text: z.string().optional(),
        })
      );

      const systemPrompt = `
You are an expert in the field. Analyze the document text and provide suggestions.

Rules:
- For comments: use "type": "comment" with "target" (exact clause/sentence) and "text" (your commentary)
- For edits: use "type": "edit" with "old" (exact original text) and "new" (suggested replacement)
- "target" or "old" must be exact substrings from the document text
- Focus on: unusual clauses, potential risks, non-standard terms, legal compliance issues
- Limit to maximum 15 suggestions to maintain quality and avoid overwhelming the user
- Prioritize the most critical issues first
`;

      // Fetch the DOCX document
      const response = await fetch(document.content || "");

      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();

      const { value: extractedText } = await mammoth.extractRawText({
        buffer: Buffer.from(arrayBuffer),
      });

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error("No text could be extracted from the document");
      }

      // Truncate if too long (avoid token limits)
      const maxChars = 50000; // ~12k tokens
      const textToAnalyze =
        extractedText.length > maxChars
          ? extractedText.substring(0, maxChars) +
            "\n\n[Document truncated due to length...]"
          : extractedText;

      console.log("Calling AI for DOCX document review...");

      const { object: suggestions } = await generateObject({
        model: myProvider.languageModel("artifact-model"),
        system: systemPrompt,
        prompt: `Document text:\n\n${textToAnalyze}`,
        schema: suggestionSchema,
      });

      // Save AI suggestions to database
      if (suggestions.length > 0 && session.user?.id) {
        await saveAISuggestions({
          documentId: document.id,
          suggestions,
          userId: session.user.id,
          documentCreatedAt: document.createdAt,
        });
      }

      return document.content || "";
    } catch (error) {
      console.error("DOCX document review failed:", error);

      // Handle rate limit errors specifically
      if (
        error instanceof Error &&
        (error.message.includes("429") || error.message.includes("rate_limit"))
      ) {
        dataStream.write({
          type: "error",
          errorText:
            "Rate limit exceeded. Please wait a moment before trying again.",
        });
      } else {
        dataStream.write({
          type: "error",
          errorText: `Failed to review document: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        });
      }

      dataStream.write({ type: "data-finish", data: null, transient: true });

      return "";
    }
  },
});
