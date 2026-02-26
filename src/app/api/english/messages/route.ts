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
        { status: 400 }
      );
    }

    // ── Ownership check ─────────────────────────────────
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

    // ── Load all messages with corrections ──────────────
    const messages = await prisma.englishMessage.findMany({
      where: { sessionId },
      include: { correction: true },
      orderBy: { orderIndex: "asc" },
    });

    return NextResponse.json({ messages });
  } catch (err) {
    console.error("[english/messages]", err);
    return NextResponse.json(
      { error: "Failed to load messages" },
      { status: 500 }
    );
  }
}