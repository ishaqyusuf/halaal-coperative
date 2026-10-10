import { buildRequestContext } from "@halaalvest/api/context"
import { appRouter } from "@halaalvest/api/router"
import { createCallerFactory } from "@halaalvest/api/trpc"
import {
  resolveQaQuickFillContext,
  type QaQuickFillContext,
} from "@halaalvest/utils"
import { cookies, headers } from "next/headers"

const qaAuthorizationCookie = "halaalvest_qa_authorization"
const qaClientCookie = "halaalvest_qa_client"
const createCaller = createCallerFactory(appRouter)

export async function getMarketingQaQuickFillContext(): Promise<QaQuickFillContext> {
  const cookieStore = await cookies()
  const authorizationToken = cookieStore.get(qaAuthorizationCookie)?.value
  const clientId = cookieStore.get(qaClientCookie)?.value
  if (!authorizationToken || !clientId) {
    return resolveQaQuickFillContext({
      authenticatedEmail: null,
      configuredDomains: [],
      isDevelopment: false,
    })
  }

  try {
    const caller = createCaller(await buildRequestContext(await headers()))
    const profiles = await caller.qaAccelerator.profiles({
      authorizationToken,
      clientId,
      clientKind: "web",
      contractVersion: 1,
    })
    return resolveQaQuickFillContext({
      authenticatedEmail: `authorized@${profiles.qaDomain}`,
      configuredDomains: [profiles.qaDomain],
      isDevelopment: false,
    })
  } catch {
    return resolveQaQuickFillContext({
      authenticatedEmail: null,
      configuredDomains: [],
      isDevelopment: false,
    })
  }
}
