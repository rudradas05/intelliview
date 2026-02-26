import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { generateJSON } from "@/lib/ai/gemini";
import { buildEnglishCoachPrompt } from "@/lib/ai/prompts";
import { EnglishResponseSchema } from "@/lib/ai/schemas";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // ── Auth guard ──────────────────────────────────────
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ── Parse + validate body ───────────────────────────
    const body = await req.json();
    const { sessionId, transcript } = body;

    if (!sessionId || !transcript?.trim()) {
      return NextResponse.json(
        { error: "sessionId and transcript are required" },
        { status: 400 }
      );
    }

    if (transcript.trim().length > 2000) {
      return NextResponse.json(
        { error: "Message too long (max 2000 characters)" },
        { status: 400 }
      );
    }

    // ── Load session ────────────────────────────────────
    const englishSession = await prisma.englishSession.findUnique({
      where: { id: sessionId },
    });

    if (!englishSession) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    if (englishSession.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (englishSession.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Session is no longer active" },
        { status: 400 }
      );
    }

    // ── Load last 6 messages for context ────────────────
    const recentMessages = await prisma.englishMessage.findMany({
      where: { sessionId },
      orderBy: { orderIndex: "desc" },
      take: 6,
    });

    const conversationHistory = recentMessages
      .reverse()
      .map((m) => ({
        role: m.role as "USER" | "AI",
        content: m.content,
      }));

    // ── Get scenario context if SCENARIO mode ───────────
    let scenarioContext: string | undefined;
    if (englishSession.mode === "SCENARIO") {
      const firstMessage = await prisma.englishMessage.findFirst({
        where: { sessionId, role: "AI" },
        orderBy: { orderIndex: "asc" },
      });
      scenarioContext = firstMessage?.content;
    }

    // ── Get current message count for orderIndex ────────
    const messageCount = await prisma.englishMessage.count({
      where: { sessionId },
    });

    // ── Call Gemini ─────────────────────────────────────
    const aiResult = await generateJSON(
      buildEnglishCoachPrompt({
        level: englishSession.level as "CASUAL" | "PROFESSIONAL",
        mode: englishSession.mode as "FREE" | "SCENARIO",
        scenarioContext,
        conversationHistory,
        userMessage: transcript.trim(),
      }),
      EnglishResponseSchema
    );

    // ── Save user message + AI response + correction ────
    await prisma.$transaction(async (tx) => {
      // Save user message
      const userMessage = await tx.englishMessage.create({
        data: {
          sessionId,
          role: "USER",
          content: transcript.trim(),
          orderIndex: messageCount,
        },
      });

      // Save correction for user message
      await tx.englishCorrection.create({
        data: {
          messageId: userMessage.id,
          originalText: aiResult.correction.originalText,
          correctedText: aiResult.correction.correctedText,
          grammarErrors: aiResult.correction.grammarErrors,
          vocabularySuggestions: aiResult.correction.vocabularySuggestions,
          rephrasedVersion: aiResult.correction.rephrasedVersion ?? null,
          toneIssue: aiResult.correction.toneIssue ?? null,
          fluencyScore: aiResult.correction.fluencyScore,
        },
      });

      // Save AI response
      await tx.englishMessage.create({
        data: {
          sessionId,
          role: "AI",
          content: aiResult.aiResponse,
          orderIndex: messageCount + 1,
        },
      });
    });

    // ── Compute running fluency average ─────────────────
    const allCorrections = await prisma.englishCorrection.findMany({
      where: { message: { sessionId } },
      select: { fluencyScore: true },
    });

    const runningFluency =
      allCorrections.length > 0
        ? Math.round(
            (allCorrections.reduce((sum, c) => sum + c.fluencyScore, 0) /
              allCorrections.length) *
              10
          ) / 10
        : aiResult.correction.fluencyScore;

    return NextResponse.json({
      aiMessage: aiResult.aiResponse,
      correction: aiResult.correction,
      runningFluency,
    });
  } catch (err) {
    console.error("[english/message]", err);

    if (err instanceof Error && err.message === "AI_GENERATION_FAILED") {
      return NextResponse.json(
        { error: "Failed to process message. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}