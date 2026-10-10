import { buildRequestContext } from "@halaalvest/api/context"
import { isQaAnalyticsPrincipal } from "@halaalvest/events/qa-policy-server"
import { headers } from "next/headers"
import { getMarketingQaQuickFillContext } from "./qa-form-access.server"
export async function getAnalyticsPolicy() {
  const [context, qa] = await Promise.all([
    buildRequestContext(await headers()),
    getMarketingQaQuickFillContext(),
  ])
  return {
    enabled: !isQaAnalyticsPrincipal({
      email: context.auth.session?.user.email,
      dataClassification: context.tenant.current?.dataClassification,
      qaSession: Boolean(context.auth.session?.qaAuthorizationId) || qa.enabled,
    }),
  }
}
