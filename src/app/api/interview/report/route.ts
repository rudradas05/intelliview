import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
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

    // ── Get sessionId ───────────────────────────────────
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 },
      );
    }

    // ── Ownership check ─────────────────────────────────
    const interviewSession = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
    });

    if (!interviewSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (interviewSession.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── Return cached report if exists ──────────────────
    const existingReport = await prisma.interviewReport.findUnique({
      where: { sessionId },
    });

    if (existingReport) {
      const transcript = await buildTranscript(sessionId);
      return NextResponse.json({ report: existingReport, transcript });
    }

    // ── Load all questions + answers + evaluations ──────
    const questions = await prisma.question.findMany({
      where: { sessionId },
      include: {
        answer: {
          include: { evaluation: true },
        },
      },
      orderBy: { orderIndex: "asc" },
    });

    // ── Only score main questions ───────────────────────
    const mainQuestions = questions.filter((q) => !q.isFollowUp);
    const scoredMain = mainQuestions.filter((q) => q.answer?.evaluation);

    if (scoredMain.length === 0) {
      return NextResponse.json(
        { error: "No completed questions found" },
        { status: 400 },
      );
    }

    // ── Compute overall score ───────────────────────────
    const overallScore =
      scoredMain.reduce((sum, q) => sum + q.answer!.evaluation!.score, 0) /
      scoredMain.length;

    // ── Compute topic scores ────────────────────────────
    const topicMap = new Map<string, number[]>();
    for (const q of scoredMain) {
      const score = q.answer!.evaluation!.score;
      const existing = topicMap.get(q.topic) ?? [];
      topicMap.set(q.topic, [...existing, score]);
    }

    const topicScores = Array.from(topicMap.entries()).map(
      ([topic, scores]) => ({
        topic,
        avgScore:
          Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) /
          10,
        questionCount: scores.length,
      }),
    );

    // Sort worst to best
    topicScores.sort((a, b) => a.avgScore - b.avgScore);

    // ── Aggregate strengths + weaknesses ────────────────
    const allStrengths = scoredMain.flatMap(
      (q) => q.answer!.evaluation!.strengths as string[],
    );
    const allMissing = scoredMain.flatMap(
      (q) => q.answer!.evaluation!.missingPoints as string[],
    );

    const strengths = [...new Set(allStrengths)].slice(0, 6);
    const weaknesses = [...new Set(allMissing)].slice(0, 6);

    // ── Generate improvement tips ───────────────────────
    const weakTopics = topicScores.filter((t) => t.avgScore < 6);
    const improvementTips = weakTopics.map(
      (t) =>
        `Strengthen ${t.topic}: Review core concepts and practice applying ` +
        `them in real scenarios. Focus on the gaps identified in your answers.`,
    );

    // ── Store report ────────────────────────────────────
    const report = await prisma.interviewReport.create({
      data: {
        sessionId,
        overallScore: Math.round(overallScore * 10) / 10,
        topicScores,
        strengths,
        weaknesses,
        improvementTips,
      },
    });

    // ── Mark session completed ──────────────────────────
    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: { status: "COMPLETED", endedAt: new Date() },
    });

    const transcript = await buildTranscript(sessionId);

    return NextResponse.json({ report, transcript });
  } catch (err) {
    console.error("[interview/report]", err);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 },
    );
  }
}

// ── Helper: build full transcript ──────────────────────
async function buildTranscript(sessionId: string) {
  const questions = await prisma.question.findMany({
    where: { sessionId, isFollowUp: false },
    include: {
      answer: { include: { evaluation: true } },
      followUps: {
        include: {
          answer: { include: { evaluation: true } },
        },
      },
    },
    orderBy: { orderIndex: "asc" },
  });

  return questions.map((q) => {
    const followUp = q.followUps?.[0];
    return {
      question: {
        id: q.id,
        questionText: q.questionText,
        topic: q.topic,
        difficulty: q.difficulty.toLowerCase(),
        orderIndex: q.orderIndex,
      },
      answer: q.answer
        ? {
            answerText: q.answer.answerText,
            submittedAt: q.answer.submittedAt,
          }
        : null,
      evaluation: q.answer?.evaluation
        ? {
            score: q.answer.evaluation.score,
            strengths: q.answer.evaluation.strengths,
            missingPoints: q.answer.evaluation.missingPoints,
            feedback: q.answer.evaluation.feedback,
            nextFocusTopic: q.answer.evaluation.nextFocusTopic,
            confidenceInAnswer: q.answer.evaluation.confidenceInAnswer,
          }
        : null,
      followUp: followUp
        ? {
            question: {
              questionText: followUp.questionText,
              topic: followUp.topic,
            },
            answer: followUp.answer
              ? { answerText: followUp.answer.answerText }
              : null,
            evaluation: followUp.answer?.evaluation
              ? {
                  score: followUp.answer.evaluation.score,
                  strengths: followUp.answer.evaluation.strengths,
                  missingPoints: followUp.answer.evaluation.missingPoints,
                  feedback: followUp.answer.evaluation.feedback,
                  nextFocusTopic: followUp.answer.evaluation.nextFocusTopic,
                  confidenceInAnswer:
                    followUp.answer.evaluation.confidenceInAnswer,
                }
              : null,
          }
        : null,
    };
  });
}
