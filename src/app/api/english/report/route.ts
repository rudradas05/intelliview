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
    const englishSession = await prisma.englishSession.findUnique({
      where: { id: sessionId },
    });

    if (!englishSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (englishSession.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── Load report ─────────────────────────────────────
    const report = await prisma.englishReport.findUnique({
      where: { sessionId },
    });

    if (!report) {
      return NextResponse.json(
        { error: "Report not found. Please end the session first." },
        { status: 404 },
      );
    }

    // ── Load full transcript ────────────────────────────
    const messages = await prisma.englishMessage.findMany({
      where: { sessionId },
      include: { correction: true },
      orderBy: { orderIndex: "asc" },
    });

    // ── Build transcript pairs ──────────────────────────
    const transcript = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.role === "USER") {
        const nextMsg = messages[i + 1];
        transcript.push({
          userMessage: msg.content,
          aiResponse: nextMsg?.role === "AI" ? nextMsg.content : "",
          correction: msg.correction
            ? {
                originalText: msg.correction.originalText,
                correctedText: msg.correction.correctedText,
                grammarErrors: msg.correction.grammarErrors,
                vocabularySuggestions: msg.correction.vocabularySuggestions,
                rephrasedVersion: msg.correction.rephrasedVersion,
                toneIssue: msg.correction.toneIssue,
                fluencyScore: msg.correction.fluencyScore,
              }
            : null,
          orderIndex: msg.orderIndex,
        });
      }
    }

    return NextResponse.json({ report, transcript });
  } catch (err) {
    console.error("[english/report]", err);
    return NextResponse.json(
      { error: "Failed to load report" },
      { status: 500 },
    );
  }
}
