import { describe, expect, test } from "bun:test"
import {
  inspectPublicPages,
  requiredPublicPages,
} from "./public-pages-preflight"
import {
  publicPolicies,
  type PolicyPublication,
} from "../packages/domain/src/modules/public-policies"
import { publicPolicyApprovalHash } from "../packages/db/src/legal-publication"

const origin = "https://halaalvest.com"
const approval = {
  version: "1",
  approvedAt: "2026-09-23T00:00:00Z",
  effectiveAt: "2026-09-24T00:00:00Z",
  approvalReference: "test-only-review",
}
const publications = Object.fromEntries(
  Object.entries(publicPolicies).map(([page, policy]) => [
    page,
    {
      status: "published",
      ...approval,
      approvedSnapshotHash: publicPolicyApprovalHash(
        page as keyof typeof publicPolicies,
        approval,
        policy
      ),
    },
  ])
) as Record<keyof typeof publicPolicies, PolicyPublication>

function readyPage(path: string) {
  const page = path.slice(1) as keyof typeof publicPolicies
  const publication = publications[page]
  if (publication.status !== "published")
    throw new Error("Test publication missing")
  return `<html><head><meta name="robots" content="index, follow"></head><body><main data-policy-approval-hash="${publication.approvedSnapshotHash}"><h1>${publicPolicies[page].title}</h1><p>HalaalVest Revision ${publication.version} · Effective ${publication.effectiveAt}</p>${path === "/delete-account" ? "<form><h2>Start an account deletion request</h2><button>Email verification link</button></form>" : ""}</main></body></html>`
}

function legalBundle() {
  return {
    available: true,
    acceptanceRequired: true,
    documents: (["terms", "privacy"] as const).map((documentType) => {
      const publication = publications[documentType]
      if (publication.status !== "published")
        throw new Error("Test publication missing")
      return {
        contentHash: publication.approvedSnapshotHash,
        documentType,
        documentVersion: publication.version,
        url: `${origin}/${documentType}`,
      }
    }),
  }
}

function responseFor(path: string, overrides?: Record<string, Response>) {
  if (overrides?.[path]) return overrides[path]
  if (path === "/api/legal") return Response.json(legalBundle())
  if (path.startsWith("/delete-account/verify?challenge="))
    return new Response(
      '<html><head><meta name="robots" content="noindex, nofollow"></head><body><h1>Verify account deletion request</h1><p role="status">Checking verification link…</p></body></html>',
      {
        headers: {
          "cache-control": "private, no-store",
          "content-type": "text/html; charset=utf-8",
          "referrer-policy": "no-referrer",
        },
      }
    )
  if (path === "/delete-account/verify")
    return new Response(
      '<html><head><meta name="robots" content="noindex, nofollow"></head><body><h1>Verify account deletion request</h1><p>This verification link is incomplete. <a href="/delete-account">Request a new link</a></p></body></html>',
      {
        headers: {
          "cache-control": "private, no-store",
          "content-type": "text/html; charset=utf-8",
          "referrer-policy": "no-referrer",
        },
      }
    )
  return new Response(readyPage(path), {
    headers: { "content-type": "text/html; charset=utf-8" },
  })
}

function fixtureFetch(overrides?: Record<string, Response>) {
  return (async (url: string | URL | Request) => {
    const parsed = new URL(String(url))
    return responseFor(`${parsed.pathname}${parsed.search}`, overrides)
  }) as typeof fetch
}

describe("public pages preflight", () => {
  test("accepts effective pages, a working deletion form, and matching legal bundle", async () => {
    const result = await inspectPublicPages(
      origin,
      fixtureFetch(),
      publications
    )

    expect(result.ready).toBe(true)
    expect(result.checks).toHaveLength(requiredPublicPages.length + 2)
  })

  test("blocks missing pages and redirects before a production submission", async () => {
    const result = await inspectPublicPages(
      origin,
      fixtureFetch({
        "/privacy": new Response("Missing", { status: 404 }),
        "/support": new Response(null, {
          headers: { location: "/login" },
          status: 302,
        }),
      }),
      publications
    )

    expect(result.ready).toBe(false)
    expect(result.checks).toContainEqual({
      path: "/privacy",
      ready: false,
      reason: "http-404",
    })
    expect(result.checks).toContainEqual({
      path: "/support",
      ready: false,
      reason: "http-302",
    })
  })

  test("blocks draft pages, unavailable deletion forms, and mismatched acceptance URLs", async () => {
    const bundle = legalBundle()
    bundle.documents[0]!.url = "https://another.example/terms"
    const result = await inspectPublicPages(
      origin,
      fixtureFetch({
        "/terms": new Response(
          '<html><meta name="robots" content="noindex, follow">HalaalVest Revision 1</html>',
          { headers: { "content-type": "text/html" } }
        ),
        "/delete-account": new Response(
          readyPage("/delete-account").replace(/<form.*?<\/form>/, ""),
          {
            headers: { "content-type": "text/html" },
          }
        ),
        "/api/legal": Response.json(bundle),
      }),
      publications
    )

    expect(result.ready).toBe(false)
    expect(result.checks.filter((check) => !check.ready)).toEqual([
      { path: "/terms", ready: false, reason: "not-publicly-effective" },
      {
        path: "/delete-account",
        ready: false,
        reason: "deletion-form-unavailable",
      },
      { path: "/api/legal", ready: false, reason: "legal-bundle-invalid" },
    ])
  })

  test("blocks a draft-only legal bundle even if public pages return 200", async () => {
    const result = await inspectPublicPages(
      origin,
      fixtureFetch({
        "/api/legal": Response.json({
          acceptanceRequired: false,
          available: false,
          documents: [],
        }),
      }),
      publications
    )

    expect(result.ready).toBe(false)
    expect(result.checks.at(-1)).toEqual({
      path: "/api/legal",
      ready: false,
      reason: "legal-bundle-not-effective",
    })
  })

  test("blocks a missing or indexable deletion verification page", async () => {
    for (const response of [
      new Response("Missing", { status: 404 }),
      new Response(
        "<html><h1>Verify account deletion request</h1>This verification link is incomplete. Request a new link</html>",
        {
          headers: {
            "cache-control": "private, no-store",
            "content-type": "text/html",
            "referrer-policy": "no-referrer",
          },
        }
      ),
    ]) {
      const result = await inspectPublicPages(
        origin,
        fixtureFetch({ "/delete-account/verify": response }),
        publications
      )
      expect(result.ready).toBe(false)
      expect(
        result.checks.find((check) => check.path === "/delete-account/verify")
          ?.reason
      ).toBe(
        response.status === 404 ? "http-404" : "deletion-verification-indexable"
      )
    }
  })

  test("blocks a verification page without private-link response headers", async () => {
    const html =
      '<html><meta name="robots" content="noindex"><h1>Verify account deletion request</h1>This verification link is incomplete. Request a new link</html>'
    for (const [headers, reason] of [
      [
        { "content-type": "text/html", "referrer-policy": "no-referrer" },
        "deletion-verification-cacheable",
      ],
      [
        { "cache-control": "private, no-store", "content-type": "text/html" },
        "deletion-verification-referrer",
      ],
    ] as const) {
      const result = await inspectPublicPages(
        origin,
        fixtureFetch({
          "/delete-account/verify": new Response(html, { headers }),
        }),
        publications
      )
      expect(result.ready).toBe(false)
      expect(
        result.checks.find((check) => check.path === "/delete-account/verify")
          ?.reason
      ).toBe(reason)
    }
  })

  test("blocks a missing or cacheable emailed verification route", async () => {
    const challengePath =
      "/delete-account/verify?challenge=00000000-0000-4000-8000-000000000000"
    for (const [response, reason] of [
      [new Response("Missing", { status: 404 }), "deletion-challenge-http-404"],
      [
        new Response(
          '<html><meta name="robots" content="noindex"><h1>Verify account deletion request</h1>Checking verification link…</html>',
          {
            headers: {
              "content-type": "text/html",
              "referrer-policy": "no-referrer",
            },
          }
        ),
        "deletion-challenge-cacheable",
      ],
    ] as const) {
      const result = await inspectPublicPages(
        origin,
        fixtureFetch({ [challengePath]: response }),
        publications
      )
      expect(result.ready).toBe(false)
      expect(
        result.checks.find((check) => check.path === "/delete-account/verify")
          ?.reason
      ).toBe(reason)
    }
  })

  test("rejects nonpublic or placeholder origins", async () => {
    for (const value of [
      "http://halaalvest.com",
      "https://api.validation.invalid",
      "https://example.com",
    ]) {
      await expect(inspectPublicPages(value, fixtureFetch())).rejects.toThrow()
    }
  })

  test("blocks current draft source even if remote HTML looks published", async () => {
    const result = await inspectPublicPages(origin, fixtureFetch())
    expect(result.ready).toBe(false)
    expect(
      result.checks.every(
        (check) => check.reason === "source-policy-not-effective"
      )
    ).toBe(true)
  })

  test("blocks a page hash or legal bundle hash that differs from the approved source", async () => {
    const bundle = legalBundle()
    bundle.documents[0]!.contentHash = "a".repeat(64)
    const result = await inspectPublicPages(
      origin,
      fixtureFetch({
        "/billing-policy": new Response(
          readyPage("/billing-policy").replace(
            /data-policy-approval-hash="[a-f0-9]{64}"/,
            `data-policy-approval-hash="${"b".repeat(64)}"`
          ),
          { headers: { "content-type": "text/html" } }
        ),
        "/api/legal": Response.json(bundle),
      }),
      publications
    )
    expect(result.checks).toContainEqual({
      path: "/billing-policy",
      ready: false,
      reason: "policy-page-unrecognized",
    })
    expect(result.checks).toContainEqual({
      path: "/api/legal",
      ready: false,
      reason: "legal-bundle-invalid",
    })
  })
})
