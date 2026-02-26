import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { generateJSON } from "@/lib/ai/gemini";
import { buildEnglishOpeningPrompt } from "@/lib/ai/prompts";
import { z } from "zod";

export const runtime = "nodejs";

const CreateEnglishSchema = z.object({
  mode: z.enum(["FREE", "SCENARIO"]),
  level: z.enum(["CASUAL", "PROFESSIONAL"]),
});

const OpeningMessageSchema = z.object({
  message: z.string().min(1),
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
    const parsed = CreateEnglishSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { mode, level } = parsed.data;

    // ── Generate opening message via Gemini ─────────────
    const opening = await generateJSON(
      buildEnglishOpeningPrompt({ mode, level }),
      OpeningMessageSchema,
    );

    // ── Create session + opening message in transaction ─
    const result = await prisma.$transaction(async (tx) => {
      const englishSession = await tx.englishSession.create({
        data: {
          userId: user.id,
          mode,
          level,
        },
      });

      await tx.englishMessage.create({
        data: {
          sessionId: englishSession.id,
          role: "AI",
          content: opening.message,
          orderIndex: 0,
        },
      });

      return englishSession;
    });

    return NextResponse.json({
      sessionId: result.id,
      openingMessage: opening.message,
    });
  } catch (err) {
    console.error("[english/create]", err);
    return NextResponse.json(
      { error: "Failed to create English session" },
      { status: 500 },
    );
  }
}
