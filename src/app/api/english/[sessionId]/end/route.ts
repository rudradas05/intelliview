import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
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

    const { sessionId } = await params;

    // ── Load session ────────────────────────────────────
    const englishSession = await prisma.englishSession.findUnique({
      where: { id: sessionId },
    });

    if (!englishSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (englishSession.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── Load all corrections ────────────────────────────
    const corrections = await prisma.englishCorrection.findMany({
      where: { message: { sessionId } },
      include: { message: true },
    });

    if (corrections.length === 0) {
      return NextResponse.json(
        { error: "No messages to report on" },
        { status: 400 },
      );
    }

    // ── Compute scores ──────────────────────────────────
    const fluencyScores = corrections.map((c) => c.fluencyScore);
    const overallFluency =
      fluencyScores.reduce((a, b) => a + b, 0) / fluencyScores.length;

    // Grammar score: 10 minus avg errors per message
    const avgGrammarErrors =
      corrections.reduce(
        (sum, c) => sum + (c.grammarErrors as unknown[]).length,
        0,
      ) / corrections.length;
    const grammarScore = Math.max(0, 10 - avgGrammarErrors * 2);

    // Vocabulary score: based on suggestions count
    const avgVocabSuggestions =
      corrections.reduce(
        (sum, c) => sum + (c.vocabularySuggestions as unknown[]).length,
        0,
      ) / corrections.length;
    const vocabularyScore = Math.max(0, 10 - avgVocabSuggestions * 1.5);

    // Tone score: 10 minus 2 for each tone issue
    const toneIssueCount = corrections.filter(
      (c) => c.toneIssue !== null,
    ).length;
    const toneScore = Math.max(
      0,
      10 - (toneIssueCount / corrections.length) * 10,
    );

    // ── Compute common mistakes ─────────────────────────
    const errorTypeMap: Map<string, { count: number; examples: string[] }> =
      new Map();

    for (const c of corrections) {
      const errors = c.grammarErrors as {
        error: string;
        explanation: string;
      }[];
      for (const e of errors) {
        const existing = errorTypeMap.get(e.error) ?? {
          count: 0,
          examples: [],
        };
        errorTypeMap.set(e.error, {
          count: existing.count + 1,
          examples: [
            ...existing.examples.slice(0, 2),
            c.originalText.slice(0, 60),
          ],
        });
      }
    }

    const commonMistakes = Array.from(errorTypeMap.entries())
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // ── Vocabulary highlights ───────────────────────────
    const vocabHighlights = corrections
      .flatMap((c) =>
        (
          c.vocabularySuggestions as {
            original: string;
            suggested: string;
          }[]
        ).map((s) => `"${s.original}" → "${s.suggested}"`),
      )
      .slice(0, 10);

    // ── Improvement tips ────────────────────────────────
    const tips: string[] = [];
    if (grammarScore < 7)
      tips.push(
        "Focus on grammar fundamentals — review subject-verb agreement and tense consistency.",
      );
    if (vocabularyScore < 7)
      tips.push(
        "Expand your vocabulary by reading English content daily and noting better word choices.",
      );
    if (toneScore < 7)
      tips.push(
        `Practice ${englishSession.level === "PROFESSIONAL" ? "professional" : "appropriate"} tone — avoid overly casual language in formal contexts.`,
      );
    if (overallFluency < 6)
      tips.push(
        "Practice speaking in longer sentences — aim for complete thoughts with clear structure.",
      );
    if (tips.length === 0)
      tips.push(
        "Great session! Keep practicing consistently to maintain and improve your fluency.",
      );

    // ── Save report + update session ────────────────────
    await prisma.$transaction(async (tx) => {
      await tx.englishReport.create({
        data: {
          sessionId,
          overallFluency: Math.round(overallFluency * 10) / 10,
          grammarScore: Math.round(grammarScore * 10) / 10,
          vocabularyScore: Math.round(vocabularyScore * 10) / 10,
          toneScore: Math.round(toneScore * 10) / 10,
          commonMistakes,
          vocabularyHighlights: vocabHighlights,
          improvementTips: tips,
        },
      });

      await tx.englishSession.update({
        where: { id: sessionId },
        data: {
          status: "COMPLETED",
          endedAt: new Date(),
          overallFluencyScore: Math.round(overallFluency * 10) / 10,
        },
      });
    });

    return NextResponse.json({ reportReady: true });
  } catch (err) {
    console.error("[english/end]", err);
    return NextResponse.json(
      { error: "Failed to end session" },
      { status: 500 },
    );
  }
}
