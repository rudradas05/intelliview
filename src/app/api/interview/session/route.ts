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

    // ── Get sessionId from query ────────────────────────
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 },
      );
    }

    // ── Load session ────────────────────────────────────
    const interviewSession = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: {
        config: true,
        questions: {
          where: { isFollowUp: false },
          include: { answer: true },
        },
      },
    });

    if (!interviewSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // ── Ownership check ─────────────────────────────────
    if (interviewSession.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const answeredCount = interviewSession.questions.filter(
      (q) => q.answer !== null,
    ).length;

    return NextResponse.json({
      status: interviewSession.status,
      mode: interviewSession.config.mode,
      role: interviewSession.config.role,
      topics: interviewSession.config.topics,
      difficulty: interviewSession.config.difficulty,
      numQuestions: interviewSession.config.numQuestions,
      timeLimitMins: interviewSession.config.timeLimitMins,
      answeredCount,
    });
  } catch (err) {
    console.error("[interview/session]", err);
    return NextResponse.json(
      { error: "Failed to load session" },
      { status: 500 },
    );
  }
}
