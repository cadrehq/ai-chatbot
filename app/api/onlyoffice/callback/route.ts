import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Helper to fetch file buffer from remote URL
async function fetchFileBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch file");
  return Buffer.from(await res.arrayBuffer());
}

export async function POST(req: NextRequest) {
  let body: any;

  // Try to parse JSON body
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 1, message: "Invalid JSON" },
      { status: 400 }
    );
  }

  // If status is 2, fetch and save the file
  if (body.status === 2 && body.url) {
    try {
      const pathForSave = path.resolve(
        process.cwd(),
        "public",
        "onlyoffice",
        `${body.key}.docx`
      );
      const fileBuffer = await fetchFileBuffer(body.url);
      fs.mkdirSync(path.dirname(pathForSave), { recursive: true });
      fs.writeFileSync(pathForSave, fileBuffer);
      console.log("File saved to", pathForSave);
    } catch (err) {
      return NextResponse.json(
        { error: 1, message: "Failed to save file" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: 0 });
}
