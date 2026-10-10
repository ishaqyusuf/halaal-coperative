import { afterEach, expect, test } from "bun:test"
import type { MembershipRecord, TenantRecord, UserRecord } from "@halaalvest/db"
import { buildMobileProfile } from "./mobile-auth-profile"
const originalRoutes = process.env.EMAIL_QA_DOMAIN_ROUTES
const originalSecret = process.env.LOGLY_ATTRIBUTION_SECRET
afterEach(() => {
  if (originalRoutes === undefined) delete process.env.EMAIL_QA_DOMAIN_ROUTES
  else process.env.EMAIL_QA_DOMAIN_ROUTES = originalRoutes
  if (originalSecret === undefined) delete process.env.LOGLY_ATTRIBUTION_SECRET
  else process.env.LOGLY_ATTRIBUTION_SECRET = originalSecret
})
const tenant: TenantRecord = {
  id: "tenant",
  slug: "example",
  name: "Example",
  region: null,
  currencyCode: "NGN",
  timezone: "Africa/Lagos",
  status: "active",
  dataClassification: "live",
  memberCount: 1,
}
const user: UserRecord = {
  id: "user",
  tenantId: "tenant",
  email: "member@example.com",
  fullName: "Member",
  isPlatformOwner: false,
}
const membership: MembershipRecord = {
  id: "membership",
  tenantId: "tenant",
  userId: "user",
  role: "member",
  isDefault: true,
}
function profile(
  overrides: {
    user?: UserRecord
    tenant?: TenantRecord
    qaAuthorizationId?: string
  } = {}
) {
  return buildMobileProfile({
    user,
    tenant,
    membership,
    memberships: [membership],
    member: null,
    token: "test-only",
    ...overrides,
  })
}
test("QA mobile profiles explicitly deny analytics with configured attribution available", () => {
  process.env.EMAIL_QA_DOMAIN_ROUTES = JSON.stringify({
    "tester.qa.test": "tester@example.com",
  })
  process.env.LOGLY_ATTRIBUTION_SECRET =
    "test-only-attribution-secret-of-32-characters"
  for (const result of [
    profile({ qaAuthorizationId: "qa-auth" }),
    profile({ user: { ...user, email: "member@tester.qa.test" } }),
    profile({ tenant: { ...tenant, dataClassification: "qa" } }),
  ]) {
    expect(result.analyticsEnabled).toBe(false)
    expect(result.analyticsContext).toBeNull()
  }
  expect(profile().analyticsEnabled).toBe(true)
  expect(profile().analyticsContext?.token).toBeDefined()
})
test("missing attribution secret is distinct from QA denial", () => {
  delete process.env.LOGLY_ATTRIBUTION_SECRET
  expect(profile().analyticsEnabled).toBe(true)
  expect(profile().analyticsContext).toBeNull()
  expect(profile({ qaAuthorizationId: "qa-auth" }).analyticsEnabled).toBe(false)
})
