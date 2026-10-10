import { getAnalyticsPolicy } from "@/lib/analytics-policy"
export async function GET() {
  return Response.json(
    { ...(await getAnalyticsPolicy()), context: null },
    { headers: { "cache-control": "private, no-store" } }
  )
}
