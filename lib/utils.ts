import type {
  CoreAssistantMessage,
  CoreToolMessage,
  UIMessage,
  UIMessagePart,
} from 'ai';
import { type ClassValue, clsx } from 'clsx';
import { formatISO } from 'date-fns';
import { twMerge } from 'tailwind-merge';
import type { DBMessage, Document } from '@/lib/db/schema';
import { ChatSDKError, type ErrorCode } from './errors';
import type { ChatMessage, ChatTools, CustomUIDataTypes } from './types';
import { Paragraph, Table, TableCell, TableRow, TextRun } from "docx";
import { marked } from "marked";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fetcher = async (url: string) => {
  const response = await fetch(url);

  if (!response.ok) {
    const { code, cause } = await response.json();
    throw new ChatSDKError(code as ErrorCode, cause);
  }

  return response.json();
};

export async function fetchWithErrorHandlers(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  try {
    const response = await fetch(input, init);

    if (!response.ok) {
      const { code, cause } = await response.json();
      throw new ChatSDKError(code as ErrorCode, cause);
    }

    return response;
  } catch (error: unknown) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new ChatSDKError('offline:chat');
    }

    throw error;
  }
}

export function getLocalStorage(key: string) {
  if (typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
  return [];
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type ResponseMessageWithoutId = CoreToolMessage | CoreAssistantMessage;
type ResponseMessage = ResponseMessageWithoutId & { id: string };

export function getMostRecentUserMessage(messages: UIMessage[]) {
  const userMessages = messages.filter((message) => message.role === 'user');
  return userMessages.at(-1);
}

export function getDocumentTimestampByIndex(
  documents: Document[],
  index: number,
) {
  if (!documents) { return new Date(); }
  if (index > documents.length) { return new Date(); }

  return documents[index].createdAt;
}

export function getTrailingMessageId({
  messages,
}: {
  messages: ResponseMessage[];
}): string | null {
  const trailingMessage = messages.at(-1);

  if (!trailingMessage) { return null; }

  return trailingMessage.id;
}

export function sanitizeText(text: string) {
  return text.replace('<has_function_call>', '');
}

export function convertToUIMessages(messages: DBMessage[]): ChatMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role as 'user' | 'assistant' | 'system',
    parts: message.parts as UIMessagePart<CustomUIDataTypes, ChatTools>[],
    metadata: {
      createdAt: formatISO(message.createdAt),
    },
  }));
}

export function getTextFromMessage(message: ChatMessage): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

function processInlineTokens(tokens: any[]): TextRun[] {
  return tokens.map((token) => {
    switch (token.type) {
      case "strong":
        return new TextRun({ text: token.text, bold: true });
      case "em":
        return new TextRun({ text: token.text, italics: true });
      case "codespan":
        return new TextRun({ text: token.text, style: "Code" });
      case "link":
        return new TextRun({
          text: `${token.text} (${token.href})`,
          style: "Hyperlink",
        });
      case "text":
        return new TextRun(token.text);
      default:
        return new TextRun(token.text);
    }
  });
}

export function markdownToDocxParagraphs(content: string): (Paragraph | Table)[] {
  const paragraphs: (Paragraph | Table)[] = [];
  const tokens = marked.lexer(content);
  for (const token of tokens) {
    switch (token.type) {
      case "heading":
        paragraphs.push(
          new Paragraph({
            text: token.text,
            heading: `Heading${token.depth}` as any,
            spacing: { after: 200 },
          })
        );
        break;
      case "paragraph":
        paragraphs.push(
          new Paragraph({
            children: processInlineTokens(
              token.tokens || [{ type: "text", text: token.text }]
            ),
          })
        );
        break;
      case "list":
        for (const item of token.items) {
          paragraphs.push(
        new Paragraph({
          children: processInlineTokens(item.tokens || [{ type: "text", text: item.text }]),
          bullet: { level: 0 }
        })
          );
        }
        break;
      case "code":
        paragraphs.push(new Paragraph({ text: token.text, style: "Code" }));
        break;
      case "blockquote":
        paragraphs.push(new Paragraph({ text: token.text, style: "Quote" }));
        break;
      case "table": {
        const rows = [
          new TableRow({
            children: token.header.map(
              (cell: string) =>
                new TableCell({ children: [new Paragraph(cell)] })
            ),
          }),
          ...token.rows.map(
            (row: string[]) =>
              new TableRow({
                children: row.map(
                  (cell: string) =>
                    new TableCell({ children: [new Paragraph(cell)] })
                ),
              })
          ),
        ];
        paragraphs.push(new Table({ rows }));
        break;
      }
      default:
        paragraphs.push(new Paragraph(token.raw || ""));
        break;
    }
  }
  return paragraphs;
}