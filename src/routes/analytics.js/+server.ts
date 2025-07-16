import { text } from "@sveltejs/kit";

let cachedAnalytics: string | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  const now = Date.now();
  if (
    cachedAnalytics &&
    cacheTimestamp &&
    now - cacheTimestamp < CACHE_DURATION_MS
  ) {
    return text(cachedAnalytics, {
      headers: { "Content-Type": "text/javascript" },
    });
  }
  const response = await fetch("https://flickersec.fscdn.dev/analytics.js");
  const analyticsText = await response.text();
  cachedAnalytics = analyticsText;
  cacheTimestamp = now;
  return text(analyticsText, {
    headers: { "Content-Type": "text/javascript" },
  });
}
