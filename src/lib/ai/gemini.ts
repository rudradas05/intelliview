import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  generationConfig: {
    temperature: 0.4,
    maxOutputTokens: 1024,
    responseMimeType: "application/json",
  },
});

export async function generateJSON<T>(
  prompt: string,
  schema: z.ZodSchema<T>,
  retries = 1
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      // Strip markdown code fences if present (safety net)
      const cleaned = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

      const parsed = JSON.parse(cleaned);
      return schema.parse(parsed);
    } catch (err) {
      if (attempt === retries) {
        console.error("[generateJSON] Failed after retries:", err);
        throw new Error("AI_GENERATION_FAILED");
      }
      console.warn(`[generateJSON] Attempt ${attempt + 1} failed, retrying...`);
    }
  }
  throw new Error("AI_GENERATION_FAILED");
}