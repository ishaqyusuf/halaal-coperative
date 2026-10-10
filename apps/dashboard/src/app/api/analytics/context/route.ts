import { issueAnalyticsContext } from "@halaalvest/events/attribution-server"
import { getAnalyticsPolicy } from "@/lib/analytics-policy"

export async function GET() {
  const { context, enabled } = await getAnalyticsPolicy()
  const user =
    context.auth.membership || context.auth.user?.isPlatformOwner
      ? context.auth.user
      : null
  return Response.json(
    {
      enabled,
      context: enabled
        ? issueAnalyticsContext({
            project: "halaalvest-dashboard",
            user,
            tenant: context.tenant,
            role: user ? context.auth.membership?.role : null,
          })
        : null,
    },
    { headers: { "cache-control": "private, no-store" } }
  )
}
