import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { generateJSON } from "@/lib/ai/gemini";
import { buildEvaluationPrompt } from "@/lib/ai/prompts";
import { EvaluationSchema } from "@/lib/ai/schemas";

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
    const { questionId, answerText, sessionId } = body;

    if (!questionId || !sessionId) {
      return NextResponse.json(
        { error: "questionId and sessionId are required" },
        { status: 400 },
      );
    }

    if (!answerText?.trim()) {
      return NextResponse.json(
        { error: "Answer cannot be empty" },
        { status: 400 },
      );
    }

    if (answerText.trim().length > 5000) {
      return NextResponse.json(
        { error: "Answer is too long (max 5000 characters)" },
        { status: 400 },
      );
    }

    // ── Load question ───────────────────────────────────
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { session: true },
    });

    if (!question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 },
      );
    }

    // ── Ownership check ─────────────────────────────────
    if (question.session.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── Check if already answered ───────────────────────
    const existingAnswer = await prisma.answer.findUnique({
      where: { questionId },
    });
    if (existingAnswer) {
      return NextResponse.json(
        { error: "Question already answered" },
        { status: 409 },
      );
    }

    // ── Load last 3 evaluations for context ─────────────
    const previousEvals = await prisma.evaluation.findMany({
      where: {
        answer: {
          question: { sessionId },
        },
      },
      include: {
        answer: {
          include: { question: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    });

    const previousScores = previousEvals.map((e) => ({
      topic: e.answer.question.topic,
      score: e.score,
    }));

    // ── Call Gemini to evaluate 
    const evaluation = await generateJSON(
      buildEvaluationPrompt({
        questionText: question.questionText,
        topic: question.topic,
        difficulty: question.difficulty.toLowerCase() as
          | "easy"
          | "medium"
          | "hard",
        expectedPoints: question.expectedPoints as string[],
        answerText: answerText.trim(),
        previousScores,
      }),
      EvaluationSchema,
    );

    // ── Save answer + evaluation in transaction 
    await prisma.$transaction(async (tx) => {
      const answer = await tx.answer.create({
        data: {
          questionId,
          answerText: answerText.trim(),
        },
      });

      await tx.evaluation.create({
        data: {
          answerId: answer.id,
          score: evaluation.score,
          strengths: evaluation.strengths,
          missingPoints: evaluation.missingPoints,
          feedback: evaluation.feedback,
          nextFocusTopic: evaluation.nextFocusTopic ?? null,
          confidenceInAnswer: evaluation.confidenceInAnswer,
        },
      });
    });

    return NextResponse.json({ evaluation });
  } catch (err) {
    console.error("[interview/submit-answer]", err);

    if (err instanceof Error && err.message === "AI_GENERATION_FAILED") {
      return NextResponse.json(
        { error: "Failed to evaluate answer. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
