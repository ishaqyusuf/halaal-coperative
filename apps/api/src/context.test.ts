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
      scope: platformSessionScope,
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
