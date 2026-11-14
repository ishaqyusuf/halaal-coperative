import type { MobileProfile } from "@/lib/session-store"
import type { AssistantApi } from "./assistant-api"
import { createFixtureAssistantApi } from "./assistant-fixture-api"

/**
 * One assistant API per signed membership. Until the coordinator registers
 * the `assistant` tRPC router in `_app.ts`, this is the fixture rehearsal
 * adapter (synthetic data only, nothing saved); the real procedures replace
 * it behind the same `AssistantApi` contract.
 */
const apis = new Map<string, AssistantApi>()

export function assistantScope(profile: MobileProfile) {
  return `${profile.tenant.id}:${profile.activeMembershipId}`
}

export function getAssistantApi(profile: MobileProfile): AssistantApi {
  const scope = assistantScope(profile)
  const existing = apis.get(scope)
  if (existing) return existing
  const api = createFixtureAssistantApi({
    role: profile.role === "member" ? "member" : "staff",
    cooperativeName: profile.tenant.name,
  })
  apis.set(scope, api)
  return api
}
