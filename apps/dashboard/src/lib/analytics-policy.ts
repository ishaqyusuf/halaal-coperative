import { isQaAnalyticsPrincipal } from "@halaalvest/events/qa-policy-server"
import { getDashboardServerContext } from "./server-context"
export async function getAnalyticsPolicy() {
  const context = await getDashboardServerContext()
  return {
    context,
    enabled: !isQaAnalyticsPrincipal({
      email: context.auth.user?.email,
      qaSession: Boolean(context.auth.qaDomain),
      dataClassification: context.tenant?.dataClassification,
    }),
  }
}
