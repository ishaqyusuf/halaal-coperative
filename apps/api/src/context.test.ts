import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  createSignedSessionToken,
  platformSessionScope,
} from "@halaalvest/auth"

import { buildRequestContext } from "./context"

describe("buildRequestContext mobile bearer sessions", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL

  beforeAll(() => {
    delete process.env.DATABASE_URL
  })

  afterAll(() => {
    if (originalDatabaseUrl) {
      process.env.DATABASE_URL = originalDatabaseUrl
    }
  })

  test("derives the user, membership, and tenant from a signed bearer token", async () => {
    const token = await createSignedSessionToken({
      membershipId: "membership-amanah-admin",
      scope: platformSessionScope,
      tenantId: "tenant-amanah-demo",
      userId: "user-tenant-admin-amanah",
    })
    const context = await buildRequestContext(
      new Headers({
        authorization: `Bearer ${token}`,
        host: "api.halaalvest.localhost",
      })
    )

    expect(context.auth.session?.token).toBe(token)
    expect(context.auth.session?.user.id).toBe("user-tenant-admin-amanah")
    expect(context.auth.activeMembership?.role).toBe("tenant_admin")
    expect(context.tenant.current?.slug).toBe("amanah")
    expect(context.request.tenantResolution.resolvedBy).toBe("fallback")
  })

  test("uses the signed membership when a multi-role account resumes", async () => {
    const token = await createSignedSessionToken({
      membershipId: "membership-amanah-admin-member",
      scope: platformSessionScope,
      tenantId: "tenant-amanah-demo",
      userId: "user-tenant-admin-amanah",
    })
    const context = await buildRequestContext(
      new Headers({
        authorization: `Bearer ${token}`,
        host: "api.halaalvest.localhost",
      })
    )

    expect(context.auth.session?.user.id).toBe("user-tenant-admin-amanah")
    expect(context.auth.activeMembership?.id).toBe(
      "membership-amanah-admin-member"
    )
    expect(context.auth.activeMembership?.role).toBe("member")
    expect(context.tenant.current?.slug).toBe("amanah")
  })

  test("does not fall back to another role when a signed membership is invalid", async () => {
    const token = await createSignedSessionToken({
      membershipId: "membership-does-not-exist",
      scope: platformSessionScope,
      tenantId: "tenant-amanah-demo",
      userId: "user-tenant-admin-amanah",
    })
    const context = await buildRequestContext(
      new Headers({
        authorization: `Bearer ${token}`,
        host: "api.halaalvest.localhost",
      })
    )

    expect(context.auth.session?.user.id).toBe("user-tenant-admin-amanah")
    expect(context.auth.activeMembership).toBeNull()
    expect(context.tenant.current?.slug).toBe("amanah")
  })

  test("does not let client headers override a signed bearer session", async () => {
    const token = await createSignedSessionToken({
      scope: platformSessionScope,
      tenantId: "tenant-barakah-demo",
      userId: "user-finance-barakah",
    })
    const context = await buildRequestContext(
      new Headers({
        authorization: `Bearer ${token}`,
        host: "api.halaalvest.localhost",
        "x-tenant-subdomain": "amanah",
        "x-user-id": "user-tenant-admin-amanah",
        "x-user-role": "super_admin",
      })
    )

    expect(context.auth.session?.user.id).toBe("user-finance-barakah")
    expect(context.auth.activeMembership?.role).toBe("finance_officer")
    expect(context.tenant.current?.slug).toBe("barakah")
  })

  test("uses the signed tenant for platform-owner mobile sessions", async () => {
    const token = await createSignedSessionToken({
      scope: platformSessionScope,
      tenantId: "tenant-barakah-demo",
      userId: "user-platform-owner",
    })
    const context = await buildRequestContext(
      new Headers({
        authorization: `Bearer ${token}`,
        host: "api.halaalvest.localhost",
      })
    )

    expect(context.auth.session?.user.id).toBe("user-platform-owner")
    expect(context.auth.activeMembership?.role).toBe("super_admin")
    expect(context.tenant.current?.slug).toBe("barakah")
  })

  test("ignores an invalid bearer token", async () => {
    const context = await buildRequestContext(
      new Headers({
        authorization: "Bearer not-a-signed-session",
        host: "api.halaalvest.localhost",
      })
    )

    expect(context.auth.session).toBeNull()
    expect(context.auth.activeMembership).toBeNull()
    expect(context.tenant.current).toBeNull()
  })
})
