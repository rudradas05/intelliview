import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Navbar from "@/components/shared/Navbar";
import ScoreOverview from "@/components/report/ScoreOverview";
import TopicBreakdown from "@/components/report/TopicBreakdown";
import StrengthsWeaknesses from "@/components/report/StrengthsWeaknesses";
import ImprovementTips from "@/components/report/ImprovementTips";
import TranscriptAccordion from "@/components/report/TranscriptAccordion";
import prisma from "@/lib/db/prisma";
import type { TranscriptItem } from "@/types/index";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/");

  const { sessionId } = await params;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) redirect("/");

  // ── Load session ────────────────────────────────────
  const interviewSession = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: { config: true },
  });

  if (!interviewSession || interviewSession.userId !== user.id) {
    redirect("/dashboard");
  }

  // ── Load or generate report ─────────────────────────
  let report = await prisma.interviewReport.findUnique({
    where: { sessionId },
  });

  // ── Load all questions ──────────────────────────────
  const questions = await prisma.question.findMany({
    where: { sessionId },
    include: {
      answer: { include: { evaluation: true } },
    },
    orderBy: { orderIndex: "asc" },
  });

  // ── Generate report if not exists ───────────────────
  if (!report) {
    const mainQuestions = questions.filter((q) => !q.isFollowUp);
    const scoredMain = mainQuestions.filter((q) => q.answer?.evaluation);

    if (scoredMain.length === 0) redirect("/dashboard");

    const overallScore =
      scoredMain.reduce((sum, q) => sum + q.answer!.evaluation!.score, 0) /
      scoredMain.length;

    const topicMap = new Map<string, number[]>();
    for (const q of scoredMain) {
      const existing = topicMap.get(q.topic) ?? [];
      topicMap.set(q.topic, [...existing, q.answer!.evaluation!.score]);
    }

    const topicScores = Array.from(topicMap.entries())
      .map(([topic, scores]) => ({
        topic,
        avgScore:
          Math.round(
            (scores.reduce((a, b) => a + b, 0) / scores.length) * 10
          ) / 10,
        questionCount: scores.length,
      }))
      .sort((a, b) => a.avgScore - b.avgScore);

    const allStrengths = scoredMain.flatMap(
      (q) => q.answer!.evaluation!.strengths as string[]
    );
    const allMissing = scoredMain.flatMap(
      (q) => q.answer!.evaluation!.missingPoints as string[]
    );

    const strengths = [...new Set(allStrengths)].slice(0, 6);
    const weaknesses = [...new Set(allMissing)].slice(0, 6);

    const weakTopics = topicScores.filter((t) => t.avgScore < 6);
    const improvementTips = weakTopics.map(
      (t) =>
        `Strengthen ${t.topic}: Review core concepts and practice applying them in real scenarios.`
    );
    if (improvementTips.length === 0) {
      improvementTips.push(
        "Great performance! Keep practicing consistently to maintain your skills."
      );
    }

    report = await prisma.interviewReport.create({
      data: {
        sessionId,
        overallScore: Math.round(overallScore * 10) / 10,
        topicScores,
        strengths,
        weaknesses,
        improvementTips,
      },
    });

    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: { status: "COMPLETED", endedAt: new Date() },
    });
  }

  // ── Build transcript ────────────────────────────────
  const mainQuestions = questions.filter((q) => !q.isFollowUp);

  const transcript: TranscriptItem[] = await Promise.all(
    mainQuestions.map(async (q) => {
      const followUp = await prisma.question.findFirst({
        where: { parentQuestionId: q.id, isFollowUp: true },
        include: { answer: { include: { evaluation: true } } },
      });

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
              strengths: q.answer.evaluation.strengths as string[],
              missingPoints: q.answer.evaluation.missingPoints as string[],
              feedback: q.answer.evaluation.feedback,
              nextFocusTopic: q.answer.evaluation.nextFocusTopic,
              confidenceInAnswer: q.answer.evaluation
                .confidenceInAnswer as "low" | "medium" | "high",
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
                    strengths: followUp.answer.evaluation
                      .strengths as string[],
                    missingPoints: followUp.answer.evaluation
                      .missingPoints as string[],
                    feedback: followUp.answer.evaluation.feedback,
                    nextFocusTopic:
                      followUp.answer.evaluation.nextFocusTopic,
                    confidenceInAnswer: followUp.answer.evaluation
                      .confidenceInAnswer as "low" | "medium" | "high",
                  }
                : null,
            }
          : null,
      };
    })
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Interview Report</h1>
          <p className="text-muted-foreground mt-1">
            Here&apos;s your complete performance breakdown
          </p>
        </div>

        <ScoreOverview
          overallScore={report.overallScore}
          sessionId={sessionId}
          mode={interviewSession.config.mode}
          role={interviewSession.config.role}
          topics={interviewSession.config.topics as string[]}
          difficulty={interviewSession.config.difficulty}
          startedAt={interviewSession.startedAt}
          endedAt={interviewSession.endedAt}
        />

        <TopicBreakdown
          topicScores={report.topicScores as { topic: string; avgScore: number; questionCount: number }[]}
        />

        <StrengthsWeaknesses
          strengths={report.strengths as string[]}
          weaknesses={report.weaknesses as string[]}
        />

        <ImprovementTips tips={report.improvementTips as string[]} />

        <TranscriptAccordion transcript={transcript} />
      </main>
    </div>
  );
}