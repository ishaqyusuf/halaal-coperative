import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  createSignedSessionToken,
  getScopedAuthSessionCookieName,
  getScopedAuthUserCookieName,
  platformSessionScope,
} from "@halaalvest/auth"

import { buildRequestContext, getRequestOrigin } from "./context"

const barakahHost = "barakah.halaalvest-dash.localhost"
const barakahScope = "barakah"

function barakahCookieHeaders(input: {
  extra?: Record<string, string>
  sessionToken: string
  userId?: string
}) {
  return new Headers({
    cookie: [
      `${getScopedAuthSessionCookieName(barakahScope)}=${input.sessionToken}`,
      ...(input.userId
        ? [`${getScopedAuthUserCookieName(barakahScope)}=${input.userId}`]
        : []),
    ].join("; "),
    host: barakahHost,
    "x-tenant-subdomain": "barakah",
    ...input.extra,
  })
}

describe("buildRequestContext web cookie sessions", () => {
  const originalDatabaseUrl = process.env.HALAALVEST_DATABASE_URL

  beforeAll(() => {
    delete process.env.HALAALVEST_DATABASE_URL
  })

  afterAll(() => {
    if (originalDatabaseUrl) {
      process.env.HALAALVEST_DATABASE_URL = originalDatabaseUrl
    }
  })

  test("derives the user and role from a signed scoped cookie", async () => {
    const token = await createSignedSessionToken({
      scope: barakahScope,
      userId: "user-finance-barakah",
    })
    const context = await buildRequestContext(
      barakahCookieHeaders({
        sessionToken: token,
        userId: "user-finance-barakah",
      })
    )

    expect(context.auth.session?.token).toBe(token)
    expect(context.auth.session?.scope).toBe(barakahScope)
    expect(context.auth.session?.user.id).toBe("user-finance-barakah")
    expect(context.auth.activeMembership?.role).toBe("finance_officer")
    expect(context.tenant.current?.slug).toBe("barakah")
  })

  test("picks the default role when an admin also has a member login", async () => {
    const token = await createSignedSessionToken({
      scope: barakahScope,
      userId: "user-finance-barakah",
    })
    const headers = barakahCookieHeaders({
      sessionToken: token,
      userId: "user-finance-barakah",
    })
    const baseline = await buildRequestContext(headers)
    const tenantId = baseline.tenant.current!.id
    // The member row comes back first, as an unordered query may return it.
    const memberships = [
      {
        id: "membership-member-first",
        isDefault: false,
        role: "member" as const,
        tenantId,
        userId: "user-finance-barakah",
      },
      {
        id: "membership-admin-default",
        isDefault: true,
        role: "tenant_admin" as const,
        tenantId,
        userId: "user-finance-barakah",
      },
    ]
    const { findUserByIdAsync, isQaAuthorizationActive, resolveTenantAsync } =
      await import("@halaalvest/db")

    const context = await buildRequestContext(headers, {
      findMembershipsForUser: async () => memberships,
      findUserById: findUserByIdAsync,
      isQaAuthorizationActive,
      resolveTenant: resolveTenantAsync,
    })

    expect(context.auth.activeMembership?.id).toBe("membership-admin-default")
    expect(context.auth.activeMembership?.role).toBe("tenant_admin")
  })

  test("accepts a signed cookie without the user hint cookie", async () => {
    const token = await createSignedSessionToken({
      scope: barakahScope,
      userId: "user-finance-barakah",
    })
    const context = await buildRequestContext(
      barakahCookieHeaders({ sessionToken: token })
    )

    expect(context.auth.session?.user.id).toBe("user-finance-barakah")
  })

  test("rejects x-user-id with an arbitrary x-session-token", async () => {
    const context = await buildRequestContext(
      new Headers({
        host: barakahHost,
        "x-session-token": "anything",
        "x-tenant-subdomain": "barakah",
        "x-user-id": "user-finance-barakah",
      })
    )

    expect(context.auth.session).toBeNull()
    expect(context.auth.activeMembership).toBeNull()
  })

  test("rejects an unsigned user cookie with an arbitrary session cookie", async () => {
    const context = await buildRequestContext(
      barakahCookieHeaders({
        sessionToken: "anything",
        userId: "user-finance-barakah",
      })
    )

    expect(context.auth.session).toBeNull()
    expect(context.auth.activeMembership).toBeNull()
  })

  test("rejects a signed cookie when the user hint names another user", async () => {
    const token = await createSignedSessionToken({
      scope: barakahScope,
      userId: "user-finance-barakah",
    })
    const context = await buildRequestContext(
      barakahCookieHeaders({
        sessionToken: token,
        userId: "user-platform-owner",
      })
    )

    expect(context.auth.session).toBeNull()
    expect(context.auth.activeMembership).toBeNull()
  })

  test("ignores x-user-id and x-session-token beside a signed cookie", async () => {
    const token = await createSignedSessionToken({
      scope: barakahScope,
      userId: "user-finance-barakah",
    })
    const context = await buildRequestContext(
      barakahCookieHeaders({
        extra: {
          "x-session-token": "anything",
          "x-user-id": "user-platform-owner",
        },
        sessionToken: token,
        userId: "user-finance-barakah",
      })
    )

    expect(context.auth.session?.token).toBe(token)
    expect(context.auth.session?.user.id).toBe("user-finance-barakah")
    expect(context.auth.activeMembership?.role).toBe("finance_officer")
  })

  test.each(["super_admin", "tenant_admin"])(
    "ignores an x-user-role %s header on a signed cookie session",
    async (role) => {
      const token = await createSignedSessionToken({
        scope: barakahScope,
        userId: "user-finance-barakah",
      })
      const context = await buildRequestContext(
        barakahCookieHeaders({
          extra: { "x-user-role": role },
          sessionToken: token,
          userId: "user-finance-barakah",
        })
      )

      expect(context.auth.session?.user.id).toBe("user-finance-barakah")
      expect(context.auth.activeMembership?.role).toBe("finance_officer")
    }
  )

  test("rejects a signed cookie minted for another session scope", async () => {
    const token = await createSignedSessionToken({
      scope: platformSessionScope,
      userId: "user-finance-barakah",
    })
    const context = await buildRequestContext(
      new Headers({
        cookie: `${getScopedAuthSessionCookieName(platformSessionScope)}=${token}; ${getScopedAuthUserCookieName(platformSessionScope)}=user-finance-barakah`,
        host: barakahHost,
        "x-tenant-subdomain": "barakah",
      })
    )

    expect(context.auth.session).toBeNull()
    expect(context.auth.activeMembership).toBeNull()
  })

  test("rejects an expired signed cookie", async () => {
    const token = await createSignedSessionToken({
      expiresAt: Date.now() - 1000,
      scope: barakahScope,
      userId: "user-finance-barakah",
    })
    const context = await buildRequestContext(
      barakahCookieHeaders({
        sessionToken: token,
        userId: "user-finance-barakah",
      })
    )

    expect(context.auth.session).toBeNull()
    expect(context.auth.activeMembership).toBeNull()
  })
})

describe("buildRequestContext mobile bearer sessions", () => {
  const originalDatabaseUrl = process.env.HALAALVEST_DATABASE_URL

  beforeAll(() => {
    delete process.env.HALAALVEST_DATABASE_URL
  })

  afterAll(() => {
    if (originalDatabaseUrl) {
      process.env.HALAALVEST_DATABASE_URL = originalDatabaseUrl
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

  test("rejects a legacy signed bearer token presented by the mobile client", async () => {
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
        "x-mobile-device-id": "mobile-legacy-session-test",
        "x-trpc-source": "mobile",
      })
    )

    expect(context.auth.session).toBeNull()
    expect(context.auth.activeMembership).toBeNull()
    expect(context.tenant.current).toBeNull()
  })

  test("accepts a mobile-kind bearer in the non-database development fallback", async () => {
    const token = await createSignedSessionToken({
      membershipId: "membership-amanah-admin",
      scope: platformSessionScope,
      sessionKind: "mobile",
      tenantId: "tenant-amanah-demo",
      userId: "user-tenant-admin-amanah",
    })
    const context = await buildRequestContext(
      new Headers({
        authorization: `Bearer ${token}`,
        host: "api.halaalvest.localhost",
        "x-mobile-device-id": "mobile-development-session-test",
        "x-trpc-source": "mobile",
      })
    )

    expect(context.auth.session?.token).toBe(token)
    expect(context.auth.session?.user.id).toBe("user-tenant-admin-amanah")
    expect(context.auth.activeMembership?.role).toBe("tenant_admin")
    expect(context.request.mobileAuthenticated).toBe(true)
  })

  test("keeps mobile access classification when a signed mobile client omits its source header", async () => {
    const token = await createSignedSessionToken({
      membershipId: "membership-amanah-admin",
      scope: platformSessionScope,
      sessionKind: "mobile",
      tenantId: "tenant-amanah-demo",
      userId: "user-tenant-admin-amanah",
    })
    const context = await buildRequestContext(
      new Headers({
        authorization: `Bearer ${token}`,
        host: "api.halaalvest.localhost",
        "x-mobile-device-id": "mobile-development-session-test",
      })
    )
    expect(context.auth.session?.token).toBe(token)
    expect(context.request.mobileAuthenticated).toBe(true)
  })
})

describe("getRequestOrigin", () => {
  test("uses the forwarded scheme and host the proxy received", () => {
    expect(
      getRequestOrigin(
        new Headers({
          host: "localhost:1441",
          "x-forwarded-host": "amana.halaalvest-dash.localhost",
          "x-forwarded-proto": "https",
        })
      )
    ).toBe("https://amana.halaalvest-dash.localhost")
  })

  test("keeps the first value of a forwarded chain", () => {
    expect(
      getRequestOrigin(
        new Headers({
          host: "internal:3000",
          "x-forwarded-host": "coop.example.com, internal:3000",
          "x-forwarded-proto": "https, http",
        })
      )
    ).toBe("https://coop.example.com")
  })

  test("returns null without a trusted scheme", () => {
    expect(getRequestOrigin(new Headers({ host: "localhost:1441" }))).toBe(
      null
    )
    expect(
      getRequestOrigin(
        new Headers({ host: "localhost:1441", "x-forwarded-proto": "ftp" })
      )
    ).toBe(null)
  })
})
