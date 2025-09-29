import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const secret = process.env.ONLY_OFFICE_JWT_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "JWT secret not set" }, { status: 500 });
  }
  const token = jwt.sign(body, secret);
  return NextResponse.json({ token });
}
