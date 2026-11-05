import { describe, expect, mock, test } from "bun:test"
import { createSignedSessionToken } from "@halaalvest/auth"
import {
  resolveRouteRole,
  type RouteRoleQueries,
  type RouteRoleRequest,
} from "./route-role"

const tenantSlug = "kaduna-reliable-health-workers-society-723"
const host = `${tenantSlug}.halaalvest-dash.localhost`
const tenantId = "tenant-kaduna"

const memberUser = {
  email: "member@kaduna.test",
  fullName: "Kaduna Member",
  id: "user-member",
  isPlatformOwner: false,
  tenantId,
}

function stubQueries(
  overrides: Partial<Record<keyof RouteRoleQueries, unknown>> = {}
) {
  const queries = {
    findMembershipsForUser: mock(async () => [
      {
        id: "m-other",
        isDefault: true,
        role: "tenant_admin",
        tenantId: "tenant-other",
        userId: memberUser.id,
      },
      {
        id: "m-kaduna",
        isDefault: false,
        role: "member",
        tenantId,
        userId: memberUser.id,
      },
    ]),
    findUserById: mock(async () => memberUser),
    getActiveQaAuthorization: mock(async () => ({
      id: "qa-1",
      qaDomain: "ishaq.qa.test",
    })),
    resolveTenant: mock(async () => ({
      resolvedBy: "subdomain",
      tenant: { id: tenantId, slug: tenantSlug },
      tenantDomain: null,
    })),
    ...Object.fromEntries(
      Object.entries(overrides).map(([key, value]) => [
        key,
        mock(async () => value),
      ])
    ),
  }

  return queries as unknown as RouteRoleQueries &
    Record<keyof RouteRoleQueries, ReturnType<typeof mock>>
}

async function requestWithSession(
  session: { qaAuthorizationId?: string; scope?: string; userId?: string } = {},
  requestHost = host
): Promise<RouteRoleRequest> {
  const scope = session.scope ?? tenantSlug
  const token = await createSignedSessionToken({
    qaAuthorizationId: session.qaAuthorizationId,
    scope,
    userId: session.userId ?? memberUser.id,
  })

  return {
    cookieHeader: `halaalvest_session_${scope}=${token}`,
    headers: new Headers({ host: requestHost }),
    tenantHostname: requestHost,
    tenantSlug: requestHost === host ? tenantSlug : null,
  }
}

describe("proxy route role resolution", () => {
  test("returns the membership role for the request's tenant in one query wave", async () => {
    const queries = stubQueries()

    expect(await resolveRouteRole(await requestWithSession(), queries)).toBe(
      "member"
    )
    expect(queries.findUserById).toHaveBeenCalledTimes(1)
    expect(queries.findMembershipsForUser).toHaveBeenCalledTimes(1)
    expect(queries.resolveTenant).toHaveBeenCalledTimes(1)
    expect(queries.getActiveQaAuthorization).not.toHaveBeenCalled()
  })

  test("makes no query without a valid signed session", async () => {
    const queries = stubQueries()
    const valid = await requestWithSession()

    for (const cookieHeader of [
      null,
      `halaalvest_session_${tenantSlug}=forged.signature`,
    ]) {
      expect(
        await resolveRouteRole({ ...valid, cookieHeader }, queries)
      ).toBeNull()
    }

    expect(queries.findUserById).not.toHaveBeenCalled()
  })

  test("rejects a session signed for another scope", async () => {
    const request = await requestWithSession({ scope: "another-cooperative" })

    expect(
      await resolveRouteRole(
        {
          ...request,
          cookieHeader: request.cookieHeader!.replace(
            "another-cooperative=",
            `${tenantSlug}=`
          ),
        },
        stubQueries()
      )
    ).toBeNull()
  })

  test("rejects a session whose QA authorization is no longer active", async () => {
    const request = await requestWithSession({
      qaAuthorizationId: "qa-revoked",
    })

    expect(
      await resolveRouteRole(
        request,
        stubQueries({ getActiveQaAuthorization: null })
      )
    ).toBeNull()
    expect(await resolveRouteRole(request, stubQueries())).toBe("member")
  })

  test("rejects a missing user and a user from another tenant", async () => {
    const request = await requestWithSession()

    expect(
      await resolveRouteRole(request, stubQueries({ findUserById: null }))
    ).toBeNull()
    expect(
      await resolveRouteRole(
        request,
        stubQueries({
          findUserById: { ...memberUser, tenantId: "tenant-other" },
        })
      )
    ).toBeNull()
  })

  test("falls back to the user's own tenant when the host names none", async () => {
    const platformHost = "halaalvest-dash.localhost"
    const request = await requestWithSession(
      { scope: "platform" },
      platformHost
    )
    request.cookieHeader = request.cookieHeader!.replace(
      "halaalvest_session_platform=",
      "halaalvest_session="
    )

    expect(
      await resolveRouteRole(
        request,
        stubQueries({
          resolveTenant: {
            resolvedBy: "none",
            tenant: null,
            tenantDomain: null,
          },
        })
      )
    ).toBe("member")
  })

  test("gives a platform owner without a membership no cooperative role", async () => {
    expect(
      await resolveRouteRole(
        await requestWithSession(),
        stubQueries({
          findMembershipsForUser: [],
          findUserById: {
            ...memberUser,
            isPlatformOwner: true,
            tenantId: "tenant-platform",
          },
        })
      )
    ).toBeNull()
  })
})
