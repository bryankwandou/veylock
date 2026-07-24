import Groq from "groq-sdk";
import { z } from "zod";

const requestSchema = z.object({
  prompt: z.string().min(12).max(1200),
  market: z.object({
    symbol: z.string(),
    price: z.number().positive(),
    confidenceUsd: z.number().nonnegative(),
    publishTime: z.number().int(),
  }).optional(),
  policy: z.object({
    maxTradeUsd: z.number().positive(),
    dailyBudgetUsd: z.number().positive(),
    dailySpentUsd: z.number().nonnegative(),
    maxDrawdownPercent: z.number().positive(),
    currentDrawdownPercent: z.number().nonnegative(),
    allowedAssets: z.array(z.string()).min(1).max(12),
    paperMode: z.boolean(),
    halted: z.boolean(),
  }),
});

const proposalSchema = z.object({
  side: z.enum(["BUY", "SELL"]),
  asset: z.string().min(2).max(12).transform((value) => value.toUpperCase()),
  amountUsd: z.number().positive().max(1_000_000),
  confidence: z.number().int().min(1).max(100),
  thesis: z.string().min(20).max(320),
  invalidation: z.string().min(15).max(240),
});

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    if (input.market && Math.abs(Date.now() / 1000 - input.market.publishTime) > 120) {
      return Response.json({ error: "The verified market snapshot is stale. Refresh it before generating an intent." }, { status: 422 });
    }
    if (!process.env.GROQ_API_KEY) {
      return Response.json({ error: "GROQ_API_KEY is not configured." }, { status: 503 });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const models = Array.from(new Set([
      process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
    ]));
    let lastError: unknown;

    for (const model of models) {
      try {
        const completion = await groq.chat.completions.create({
          model,
          temperature: 0.2,
          max_completion_tokens: 900,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: "Return only one compact JSON object with exactly six keys: side, asset, amountUsd, confidence, thesis, invalidation. side is BUY or SELL. confidence is your integer reasoning score from 1 to 100. verifiedMarketSnapshot.confidenceUsd is only the oracle's dollar confidence interval and must never be copied into confidence. You propose an intent but never approve it. Use only supplied market facts.",
            },
            { role: "user", content: JSON.stringify({ instruction: input.prompt, mandate: input.policy, verifiedMarketSnapshot: input.market ?? null }) },
          ],
        });
        const content = completion.choices[0]?.message?.content;
        if (!content) throw new Error("Groq returned an empty response");
        const proposal = proposalSchema.parse(JSON.parse(content));
        return Response.json({ proposal, model: completion.model });
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error("All Groq model attempts failed");
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "The request or model response did not match the expected contract.", issues: error.issues }, { status: 400 });
    }
    return Response.json({ error: error instanceof Error ? error.message : "Agent request failed" }, { status: 500 });
  }
}
