import { describe, expect, test } from "bun:test"
import {
  buildLoginPrefillAction,
  buildWorkspaceLoginUrl,
  getMemberCodeFromSignInInput,
  getWorkspaceSignInCandidates,
  resolveWorkspaceSignInSlug,
  type WorkspaceSignInLookups,
} from "./workspace-sign-in"

function createLookups(tenants: { prefix: string; slug: string }[]) {
  const calls: string[] = []
  const lookups: WorkspaceSignInLookups = {
    findByPrefix: async (prefix) => {
      calls.push(`prefix:${prefix}`)
      const tenant = tenants.find((entry) => entry.prefix === prefix)
      return tenant ? { slug: tenant.slug } : null
    },
    findBySlug: async (slug) => {
      calls.push(`slug:${slug}`)
      const tenant = tenants.find((entry) => entry.slug === slug)
      return tenant ? { slug: tenant.slug } : null
    },
  }

  return { calls, lookups }
}

const tenants = [
  { prefix: "AMN", slug: "amana-savings" },
  { prefix: "AMS", slug: "amana-story" },
]

describe("workspace sign-in candidates", () => {
  test("reads the workspace slug from a pasted address", () => {
    expect(
      getWorkspaceSignInCandidates("https://Amana-Savings.halaalvest.com/login")
    ).toEqual([{ kind: "slug", value: "amana-savings" }])
    expect(
      getWorkspaceSignInCandidates("amana-story.halaalvest-dash.localhost")
    ).toEqual([{ kind: "slug", value: "amana-story" }])
  })

  test("reads only the prefix from a member code, then tries it as a slug", () => {
    expect(getWorkspaceSignInCandidates(" ams-0001 ")).toEqual([
      { kind: "prefix", value: "AMS" },
      { kind: "slug", value: "ams-0001" },
    ])
  })

  test("tries a bare word as a slug, then as a code prefix", () => {
    expect(getWorkspaceSignInCandidates("AMS")).toEqual([
      { kind: "slug", value: "ams" },
      { kind: "prefix", value: "AMS" },
    ])
    expect(getWorkspaceSignInCandidates("amana savings")).toEqual([
      { kind: "slug", value: "amana-savings" },
    ])
  })

  test("ignores empty, oversized and host-less input", () => {
    expect(getWorkspaceSignInCandidates("")).toEqual([])
    expect(getWorkspaceSignInCandidates("   ")).toEqual([])
    expect(getWorkspaceSignInCandidates("a".repeat(300))).toEqual([])
    expect(getWorkspaceSignInCandidates("localhost/login")).toEqual([])
  })
})

describe("resolveWorkspaceSignInSlug", () => {
  test("resolves a workspace address and a member code", async () => {
    const { lookups } = createLookups(tenants)

    expect(
      await resolveWorkspaceSignInSlug("amana-savings.halaalvest.com", lookups)
    ).toBe("amana-savings")
    expect(await resolveWorkspaceSignInSlug("AMS-0001", lookups)).toBe(
      "amana-story"
    )
    expect(await resolveWorkspaceSignInSlug("amana-story", lookups)).toBe(
      "amana-story"
    )
  })

  test("never looks up the member number itself", async () => {
    const { calls, lookups } = createLookups(tenants)

    await resolveWorkspaceSignInSlug("AMS-9999", lookups)

    expect(calls).toEqual(["prefix:AMS"])
  })

  test("returns null for an unknown workspace", async () => {
    const { lookups } = createLookups(tenants)

    expect(await resolveWorkspaceSignInSlug("XYZ-0001", lookups)).toBeNull()
    expect(await resolveWorkspaceSignInSlug("nope", lookups)).toBeNull()
  })
})

describe("buildWorkspaceLoginUrl", () => {
  test("points at the tenant host's /login", () => {
    expect(
      buildWorkspaceLoginUrl("https://amana-story.halaalvest-dash.localhost/")
    ).toBe("https://amana-story.halaalvest-dash.localhost/login")
    expect(buildWorkspaceLoginUrl("https://amana-story.halaalvest.com")).toBe(
      "https://amana-story.halaalvest.com/login"
    )
  })
})

describe("member code prefill", () => {
  test("extracts a normalized member code, and nothing else", () => {
    expect(getMemberCodeFromSignInInput(" ams-0001 ")).toBe("AMS-0001")
    expect(getMemberCodeFromSignInInput("ams 12")).toBe("AMS-12")
    expect(getMemberCodeFromSignInInput("amana-story")).toBeNull()
    expect(
      getMemberCodeFromSignInInput("amana-story.halaalvest.com")
    ).toBeNull()
    expect(getMemberCodeFromSignInInput("AMS")).toBeNull()
  })

  test("posts to the tenant host's prefill route", () => {
    expect(
      buildLoginPrefillAction(
        "https://amana-story.halaalvest-dash.localhost/login"
      )
    ).toBe("https://amana-story.halaalvest-dash.localhost/auth/login-prefill")
  })
})
