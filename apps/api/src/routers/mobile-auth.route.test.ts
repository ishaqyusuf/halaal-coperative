import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  createSignedSessionToken,
  platformSessionScope,
} from "@halaalvest/auth"

import { buildRequestContext } from "../context"
import { createCallerFactory } from "../lib.trpc"
import { appRouter } from "./_app"

describe("mobileAuthRouter", () => {
  const originalDatabaseUrl = process.env.HALAALVEST_DATABASE_URL
  const createCaller = createCallerFactory(appRouter)

  beforeAll(() => {
    delete process.env.HALAALVEST_DATABASE_URL
  })

  afterAll(() => {
    if (originalDatabaseUrl) {
      process.env.HALAALVEST_DATABASE_URL = originalDatabaseUrl
    }
  })

  test("returns the current mobile session profile from a signed bearer token", async () => {
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
    const caller = createCaller(context)

    const response = await caller.auth.mobile.me()

    expect(response.profile.token).toBe(token)
    expect(response.profile.activeMembershipId).toBe("membership-amanah-admin")
    expect(response.profile.user.email).toBe("admin@amanah.local")
    expect(response.profile.role).toBe("admin")
    expect(response.profile.cooperativeRole).toBe("tenant_admin")
    expect(response.profile.availableRoles).toEqual([
      {
        id: "membership-amanah-admin",
        isDefault: true,
        role: "tenant_admin",
        workspaceRole: "admin",
      },
      {
        id: "membership-amanah-admin-member",
        isDefault: false,
        role: "member",
        workspaceRole: "member",
      },
    ])
    expect(response.profile.tenant.slug).toBe("amanah")
    expect(response.profile.tenant.currencyCode).toBe("NGN")
    expect(response.profile.tenant.timezone).toBe("Africa/Lagos")
    expect(response.profile.tenant.branding.mark).toBe("AS")
  })

  test("switches the active mobile membership and issues a resumable token", async () => {
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
    const caller = createCaller(context)

    const switched = await caller.auth.mobile.switchRole({
      membershipId: "membership-amanah-admin-member",
    })

    expect(switched.profile.activeMembershipId).toBe(
      "membership-amanah-admin-member"
    )
    expect(switched.profile.role).toBe("member")
    expect(switched.profile.cooperativeRole).toBe("member")

    const resumedContext = await buildRequestContext(
      new Headers({
        authorization: `Bearer ${switched.profile.token}`,
        host: "api.halaalvest.localhost",
      })
    )
    const resumed = await createCaller(resumedContext).auth.mobile.me()

    expect(resumed.profile.activeMembershipId).toBe(
      "membership-amanah-admin-member"
    )
    expect(resumed.profile.role).toBe("member")
  })

  test("rejects role switching to another account's membership", async () => {
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
    const caller = createCaller(context)

    await expect(
      caller.auth.mobile.switchRole({
        membershipId: "membership-barakah-finance",
      })
    ).rejects.toThrow("That mobile workspace is not available")
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
