import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { generateJSON } from "@/lib/ai/gemini";
import { buildResumeProfilePrompt } from "@/lib/ai/prompts";
import { ResumeProfileSchema } from "@/lib/ai/schemas";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // ── Auth guard ──────────────────────────────────────
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Get user from DB ────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ── Parse multipart form ────────────────────────────
    const formData = await req.formData();
    const file = formData.get("resume") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // ── Validate file type ──────────────────────────────
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are accepted" },
        { status: 400 },
      );
    }

    // ── Validate file size (max 5MB) ────────────────────
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB" },
        { status: 400 },
      );
    }

    // ── Extract text from PDF ───────────────────────────
    const buffer = Buffer.from(await file.arrayBuffer());

    // Dynamically import pdf-parse (avoids issues with Next.js bundler)
    // pdf-parse CommonJS import
    const pdfParse = require("pdf-parse");
    const pdfData = await pdfParse(buffer);
    const rawText = pdfData.text
      .replace(/\s+/g, " ")
      .replace(/[^\x20-\x7E\n]/g, "")
      .trim();

    // ── Validate extracted text ─────────────────────────
    if (rawText.length < 100) {
      return NextResponse.json(
        {
          error:
            "Could not read PDF — please upload a text-based resume. " +
            "Scanned image PDFs are not supported.",
        },
        { status: 422 },
      );
    }

    // ── Analyze with Gemini ─────────────────────────────
    const profile = await generateJSON(
      buildResumeProfilePrompt(rawText),
      ResumeProfileSchema,
    );

    // ── Store in database ───────────────────────────────
    const resume = await prisma.resume.create({
      data: {
        userId: user.id,
        fileName: file.name,
        rawText: rawText.slice(0, 20000), // cap at 20k chars
        profileJson: profile,
      },
    });

    return NextResponse.json({
      resumeId: resume.id,
      profile,
    });
  } catch (err) {
    console.error("[resume/upload]", err);

    // Handle AI generation failure specifically
    if (err instanceof Error && err.message === "AI_GENERATION_FAILED") {
      return NextResponse.json(
        { error: "Failed to analyze resume. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 },
    );
  }
}
