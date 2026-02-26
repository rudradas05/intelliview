import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

export const runtime = "nodejs";

const CreateInterviewSchema = z.object({
  mode: z.enum(["ROLE", "TOPICS", "RESUME"]),
  role: z.string().optional().nullable(),
  topics: z.array(z.string()).optional().default([]),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  numQuestions: z.number().int().min(1).max(30).optional().nullable(),
  timeLimitMins: z.number().int().min(5).max(120).optional().nullable(),
  noRepeats: z.boolean().default(true),
  focusWeakAreas: z.boolean().default(false),
  resumeId: z.string().optional().nullable(),
});

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

    // ── Validate body ───────────────────────────────────
    const body = await req.json();
    const parsed = CreateInterviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // ── Validate mode-specific requirements ─────────────
    if (data.mode === "ROLE" && !data.role?.trim()) {
      return NextResponse.json(
        { error: "Role name is required for ROLE mode" },
        { status: 400 },
      );
    }
    if (data.mode === "TOPICS" && (!data.topics || data.topics.length === 0)) {
      return NextResponse.json(
        { error: "At least one topic is required for TOPICS mode" },
        { status: 400 },
      );
    }
    if (data.mode === "RESUME" && !data.resumeId) {
      return NextResponse.json(
        { error: "Resume is required for RESUME mode" },
        { status: 400 },
      );
    }

    // ── Must have either numQuestions or timeLimitMins ──
    if (!data.numQuestions && !data.timeLimitMins) {
      return NextResponse.json(
        { error: "Either question count or time limit is required" },
        { status: 400 },
      );
    }

    // ── Create config + session in transaction ──────────
    const result = await prisma.$transaction(async (tx) => {
      const config = await tx.interviewConfig.create({
        data: {
          userId: user.id,
          mode: data.mode,
          role: data.role ?? null,
          topics: data.topics ?? [],
          difficulty: data.difficulty,
          numQuestions: data.numQuestions ?? null,
          timeLimitMins: data.timeLimitMins ?? null,
          noRepeats: data.noRepeats,
          focusWeakAreas: data.focusWeakAreas,
        },
      });

      const interviewSession = await tx.interviewSession.create({
        data: {
          userId: user.id,
          configId: config.id,
          resumeId: data.resumeId ?? null,
        },
      });

      return { config, session: interviewSession };
    });

    return NextResponse.json({
      sessionId: result.session.id,
    });
  } catch (err) {
    console.error("[interview/create]", err);
    return NextResponse.json(
      { error: "Failed to create interview session" },
      { status: 500 },
    );
  }
}
