import { beforeEach, describe, expect, mock, test } from "bun:test"
import { cooperativeRoles, type CooperativeRole } from "@halaalvest/auth/roles"
import { readdirSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { NextRequest } from "next/server"
import { canAccessDashboardPath } from "./lib/navigation/lib"
import {
  isRoleRestrictedDashboardPath,
  normalizeDashboardRoutePath,
} from "./lib/navigation/route-access"

// The proxy resolves the role from the signed session and the database; the
// tests stand in for that lookup so they stay source-only.
let resolvedRole: CooperativeRole | null = "member"
const resolveCachedRouteRole = mock(async () => resolvedRole)

mock.module("./lib/navigation/route-access.server", () => ({
  resolveCachedRouteRole,
}))

const { proxy } = await import("./proxy")

const tenantSlug = "kaduna-reliable-health-workers-society-723"
const host = `${tenantSlug}.halaalvest-dash.localhost`

// What the App Router sends for a client-side `<Link>` navigation from
// /notifications: the tree tells the server it already holds the (sidebar)
// layout, so that layout and its role guard are not rendered again.
const softNavigationHeaders = {
  rsc: "1",
  "next-router-state-tree": encodeURIComponent(
    JSON.stringify([
      "",
      {
        children: [
          "(app)",
          {
            children: [
              "(sidebar)",
              {
                children: [
                  "notifications",
                  { children: ["__PAGE__", {}, null, null, 0] },
                  null,
                  null,
                  0,
                ],
              },
              null,
              null,
              0,
            ],
          },
          null,
          null,
          0,
        ],
      },
      null,
      null,
      16,
    ])
  ),
}

function softNavigate(pathname: string) {
  return proxy(
    new NextRequest(`https://${host}${pathname}?_rsc=abc12`, {
      headers: {
        host,
        "x-forwarded-host": host,
        "x-forwarded-proto": "https",
        cookie: `halaalvest_session_${tenantSlug}=signed-token`,
        "next-url": pathname,
        ...softNavigationHeaders,
      },
    })
  )
}

const sidebarRoot = join(import.meta.dir, "app/(app)/(sidebar)")

function listSidebarRoutes(directory = sidebarRoot): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)

    if (statSync(path).isDirectory()) {
      return listSidebarRoutes(path)
    }

    if (entry !== "page.tsx") {
      return []
    }

    const segments = relative(sidebarRoot, directory)
      .split("/")
      .filter((segment) => segment && !segment.startsWith("("))
      .map((segment) =>
        segment.startsWith("[")
          ? "00000000-0000-4000-8000-000000000000"
          : segment
      )

    return [`/${segments.join("/")}`]
  })
}

const sidebarRoutes = listSidebarRoutes()

beforeEach(() => {
  resolvedRole = "member"
  resolveCachedRouteRole.mockClear()
})

describe("dashboard proxy role guard on client navigation", () => {
  test("covers the sidebar routes the layout guard protects", () => {
    const memberDenied = sidebarRoutes.filter(
      (route) => !canAccessDashboardPath(route, "member")
    )

    expect(sidebarRoutes.length).toBeGreaterThan(30)
    expect(memberDenied).toContain("/analytics")
    expect(memberDenied).toContain("/members")
    expect(memberDenied).toContain("/settings/finance/charges")
  })

  test.each(cooperativeRoles.map((role) => [role]))(
    "redirects %s home from every sidebar route it may not open",
    async (role) => {
      resolvedRole = role

      for (const route of sidebarRoutes) {
        const response = await softNavigate(route)
        const allowed = canAccessDashboardPath(route, role)

        if (allowed) {
          expect({ route, status: response.status }).toEqual({
            route,
            status: 200,
          })
        } else {
          expect({
            route,
            status: response.status,
            location: response.headers.get("location"),
          }).toEqual({ route, status: 307, location: `https://${host}/` })
        }
      }
    }
  )

  test("redirects a session with no usable membership from staff routes", async () => {
    resolvedRole = null

    const response = await softNavigate("/analytics")

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe(`https://${host}/`)
  })

  test("resolves no role for routes every cooperative role may open", async () => {
    for (const route of ["/notifications", "/loans", "/support"]) {
      expect((await softNavigate(route)).status).toBe(200)
    }

    expect(resolveCachedRouteRole).not.toHaveBeenCalled()
  })

  test.each([
    "/analytics.rsc",
    "/analytics.prefetch.rsc",
    "/analytics.segments/analytics/__PAGE__.segment.rsc",
    "/an%61lytics",
    "/Analytics/",
  ])("normalizes %s before checking it", async (pathname) => {
    expect(normalizeDashboardRoutePath(pathname).toLowerCase()).toStartWith(
      "/analytics"
    )
    expect(isRoleRestrictedDashboardPath(pathname)).toBe(true)
    expect((await softNavigate(pathname)).status).toBe(307)
  })
})
