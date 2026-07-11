import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  createSignedSessionToken,
  platformSessionScope,
} from "@halaalvest/auth"

import { buildRequestContext } from "../context"
import { createCallerFactory } from "../lib.trpc"
import { appRouter } from "./_app"

describe("mobileAuthRouter", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL
  const createCaller = createCallerFactory(appRouter)

  beforeAll(() => {
    delete process.env.DATABASE_URL
  })

  afterAll(() => {
    if (originalDatabaseUrl) {
      process.env.DATABASE_URL = originalDatabaseUrl
    }
  })

  test("returns the current mobile session profile from a signed bearer token", async () => {
    const token = await createSignedSessionToken({
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
    const caller = createCaller(context)

    const response = await caller.auth.mobile.me()

    expect(response.profile.token).toBe(token)
    expect(response.profile.user.email).toBe("admin@amanah.local")
    expect(response.profile.role).toBe("admin")
    expect(response.profile.cooperativeRole).toBe("tenant_admin")
    expect(response.profile.tenant.slug).toBe("amanah")
    expect(response.profile.tenant.currencyCode).toBe("NGN")
    expect(response.profile.tenant.timezone).toBe("Africa/Lagos")
    expect(response.profile.tenant.branding.mark).toBe("AS")
  })

  test("returns platform-owner selected-tenant role details on session resume", async () => {
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
    const caller = createCaller(context)

    const response = await caller.auth.mobile.me()

    expect(response.profile.role).toBe("admin")
    expect(response.profile.cooperativeRole).toBe("super_admin")
    expect(response.profile.availableRoles).toEqual([
      {
        id: "platform-owner-context-membership",
        isDefault: true,
        role: "super_admin",
        workspaceRole: "admin",
      },
    ])
    expect(response.profile.tenant.slug).toBe("barakah")
  })

  test("rejects current profile lookup without a verified session", async () => {
    const context = await buildRequestContext(
      new Headers({
        host: "api.halaalvest.localhost",
      })
    )
    const caller = createCaller(context)

    await expect(caller.auth.mobile.me()).rejects.toThrow(
      "You must be signed in to continue."
    )
  })
})
