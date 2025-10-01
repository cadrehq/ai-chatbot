import { put } from "@vercel/blob";
import { generateObject, generateText, streamObject } from "ai";
import { Document, Packer } from "docx";
import mammoth from "mammoth";
import { z } from "zod";
import { myProvider } from "@/lib/ai/providers";
import { createDocumentHandler } from "@/lib/artifacts/server";
import { generateUUID, jsonToDocx } from "@/lib/utils";
import { saveSuggestions } from "@/lib/db/queries";

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

  async onUpdateDocument({ document, dataStream, session, description }) {
    try {
      const suggestionSchema = z.array(
        z.object({
          originalText: z.string().describe("The original sentence"),
          suggestedText: z.string().describe("The suggested sentence"),
          comment: z
            .string()
            .describe("The comment on why the change is suggested"),
        })
      );

      const systemPrompt = `
    You are an expert reviewer. Analyze the provided document text and offer relevant, high-quality suggestions.

    Rules:
    - Tailor your feedback to the document's subject and context.
    - "originalText" must be exact substrings from the document text.
    - Focus on issues or improvements relevant to the document's content, such as clarity, accuracy, structure, tone, or domain-specific concerns.
    - Limit to a maximum of 10 suggestions, prioritizing the most important or impactful.

    The description of changes that need to be made if it will be useful to you, else skip it:
    ${description}
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

      const { object: suggestions } = await generateObject({
        model: myProvider.languageModel("artifact-model"),
        system: systemPrompt,
        prompt: `Document text:\n\n${textToAnalyze}`,
        schema: suggestionSchema,
      });

      if (suggestions.length > 0 && session.user?.id) {
        const userId = session.user.id;
        await saveSuggestions({
          suggestions: suggestions.map((suggestion) => ({
            ...suggestion,
            description: suggestion.comment,
            id: generateUUID(),
            documentId: document.id,
            isResolved: false,
            userId,
            createdAt: new Date(),
            documentCreatedAt: document.createdAt,
          })),
        });
      }

      return document.content || "";
    } catch (error) {
      console.error("DOCX document review failed:", error);

      dataStream.write({ type: "data-finish", data: null, transient: true });

      return "";
    }
  },
});
