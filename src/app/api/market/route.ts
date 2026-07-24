const SOL_USD_FEED = "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";

type HermesResponse = {
  parsed?: Array<{
    price: { price: string; conf: string; expo: number; publish_time: number };
    ema_price: { price: string; expo: number };
  }>;
};

type Snapshot = {
  symbol: string;
  price: number;
  confidenceUsd: number;
  emaPrice: number;
  publishTime: number;
  source: string;
  stale: boolean;
};

let cachedSnapshot: Snapshot | null = null;

export async function GET() {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(
        `https://hermes.pyth.network/v2/updates/price/latest?ids%5B%5D=${SOL_USD_FEED}&parsed=true`,
        { cache: "no-store", signal: AbortSignal.timeout(6_000) },
      );
      if (!response.ok) throw new Error(`Pyth returned ${response.status}`);
      const body = (await response.json()) as HermesResponse;
      const value = body.parsed?.[0];
      if (!value) throw new Error("Pyth returned no SOL/USD price");
      const scale = 10 ** value.price.expo;
      cachedSnapshot = {
        symbol: "SOL/USD",
        price: Number(value.price.price) * scale,
        confidenceUsd: Number(value.price.conf) * scale,
        emaPrice: Number(value.ema_price.price) * 10 ** value.ema_price.expo,
        publishTime: value.price.publish_time,
        source: "Pyth Hermes",
        stale: false,
      };
      return Response.json(cachedSnapshot);
    } catch (error) {
      lastError = error;
    }
  }

  if (cachedSnapshot && Date.now() / 1000 - cachedSnapshot.publishTime <= 120) {
    return Response.json({ ...cachedSnapshot, stale: true });
  }
  return Response.json({ error: lastError instanceof Error ? lastError.message : "Market feed failed" }, { status: 502 });
}
