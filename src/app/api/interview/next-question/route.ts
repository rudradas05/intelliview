import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { generateJSON } from "@/lib/ai/gemini";
import { buildNextQuestionPrompt } from "@/lib/ai/prompts";
import { NextQuestionSchema } from "@/lib/ai/schemas";
import type { ResumeProfile } from "@/types/index";

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

    // ── Parse body ──────────────────────────────────────
    const body = await req.json();
    const { sessionId, followUp = false, parentQuestionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 },
      );
    }

    // ── Load full session ───────────────────────────────
    const interviewSession = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: {
        config: true,
        resume: true,
        questions: {
          include: {
            answer: {
              include: { evaluation: true },
            },
          },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!interviewSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (interviewSession.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (interviewSession.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Session is no longer active" },
        { status: 400 },
      );
    }

    const cfg = interviewSession.config;

    // ── Count only main questions (not follow-ups) ──────
    const mainQuestions = interviewSession.questions.filter(
      (q) => !q.isFollowUp,
    );
    const answeredMainCount = mainQuestions.filter(
      (q) => q.answer !== null,
    ).length;
    const totalQuestions = cfg.numQuestions ?? 10;

    // ── Check if session should end ─────────────────────
    if (!followUp && answeredMainCount >= totalQuestions) {
      return NextResponse.json({ done: true });
    }

    // ── Build askedQuestions list for dedup ─────────────
    const askedQuestions = interviewSession.questions.map(
      (q) => q.questionHash,
    );

    // ── Compute weak topics ─────────────────────────────
    const evaluations = interviewSession.questions
      .filter((q) => q.answer?.evaluation)
      .map((q) => ({
        topic: q.topic,
        score: q.answer!.evaluation!.score,
      }));

    const topicScoreMap = new Map<string, number[]>();
    for (const e of evaluations) {
      const existing = topicScoreMap.get(e.topic) ?? [];
      topicScoreMap.set(e.topic, [...existing, e.score]);
    }

    const weakTopics: string[] = [];
    topicScoreMap.forEach((scores, topic) => {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avg < 6) weakTopics.push(topic);
    });

    // ── Get parent question text if follow-up ───────────
    let parentQuestionText: string | undefined;
    if (followUp && parentQuestionId) {
      const parentQ = interviewSession.questions.find(
        (q) => q.id === parentQuestionId,
      );
      parentQuestionText = parentQ?.questionText;
    }

    // ── Get resume profile if RESUME mode ───────────────
    const resumeProfile = interviewSession.resume
      ?.profileJson as ResumeProfile | null;

    // ── Get last 3 evaluations for context ──────────────
    const previousScores = evaluations.slice(-3);

    // ── Generate question with dedup check ──────────────
    let generatedQuestion;
    let questionHash = "";
    let isDuplicate = false;

    for (let attempt = 0; attempt <= 1; attempt++) {
      generatedQuestion = await generateJSON(
        buildNextQuestionPrompt({
          mode: cfg.mode as "ROLE" | "TOPICS" | "RESUME",
          role: cfg.role,
          topics: cfg.topics as string[],
          difficulty: cfg.difficulty.toLowerCase() as
            | "easy"
            | "medium"
            | "hard",
          resumeProfile,
          askedQuestions,
          weakTopics: cfg.focusWeakAreas ? weakTopics : [],
          focusWeakAreas: cfg.focusWeakAreas,
          questionNumber: answeredMainCount + 1,
          totalQuestions,
          isFollowUp: followUp,
          parentQuestionText,
        }),
        NextQuestionSchema,
      );

      // Compute hash
      questionHash = generatedQuestion.questionText
        .toLowerCase()
        .trim()
        .slice(0, 120);

      // Check for duplicate
      isDuplicate = askedQuestions.includes(questionHash);

      if (!isDuplicate) break;

      // On second attempt still duplicate → return 409
      if (attempt === 1) {
        return NextResponse.json(
          { error: "DUPLICATE_QUESTION" },
          { status: 409 },
        );
      }
    }

    if (!generatedQuestion) {
      return NextResponse.json(
        { error: "Failed to generate question" },
        { status: 500 },
      );
    }

    // ── Save question to DB ─────────────────────────────
    const savedQuestion = await prisma.question.create({
      data: {
        sessionId,
        parentQuestionId: followUp ? (parentQuestionId ?? null) : null,
        isFollowUp: followUp,
        questionText: generatedQuestion.questionText,
        questionHash,
        topic: generatedQuestion.topic,
        difficulty: generatedQuestion.difficulty.toUpperCase() as
          | "EASY"
          | "MEDIUM"
          | "HARD",
        expectedPoints: generatedQuestion.expectedPoints,
        followUpTriggers: generatedQuestion.followUpTriggers,
        orderIndex: interviewSession.questions.length,
      },
    });

    return NextResponse.json({
      questionId: savedQuestion.id,
      questionText: savedQuestion.questionText,
      topic: savedQuestion.topic,
      difficulty: savedQuestion.difficulty.toLowerCase(),
      questionNumber: answeredMainCount + 1,
      totalQuestions,
      isFollowUp: followUp,
    });
  } catch (err) {
    console.error("[interview/next-question]", err);

    if (err instanceof Error && err.message === "AI_GENERATION_FAILED") {
      return NextResponse.json(
        { error: "Failed to generate question. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
