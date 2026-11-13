import { describe, expect, test } from "bun:test"
import { WORKSPACE_NOT_FOUND_MESSAGE } from "@/lib/workspace-sign-in"
import { handleWorkspaceSignInRequest } from "./route"

const lookups = {
  findByPrefix: async (prefix: string) =>
    prefix === "AMS" ? { slug: "amana-story" } : null,
  findBySlug: async (slug: string) =>
    slug === "amana-savings" ? { slug: "amana-savings" } : null,
}

function postWorkspace(body: unknown) {
  return new Request("https://halaalvest.localhost/api/workspace-sign-in", {
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  })
}

describe("workspace sign-in API", () => {
  test("returns the tenant login URL for a workspace address", async () => {
    const response = await handleWorkspaceSignInRequest(
      postWorkspace({ workspace: "amana-savings" }),
      lookups
    )
    const body = (await response.json()) as { loginUrl: string }

    expect(response.status).toBe(200)
    expect(new URL(body.loginUrl).hostname).toStartWith("amana-savings.")
    expect(new URL(body.loginUrl).pathname).toBe("/login")
  })

  test("returns the tenant login URL for a member code without echoing it", async () => {
    const response = await handleWorkspaceSignInRequest(
      postWorkspace({ workspace: "AMS-0001" }),
      lookups
    )
    const body = (await response.json()) as { loginUrl: string }

    expect(response.status).toBe(200)
    expect(new URL(body.loginUrl).hostname).toStartWith("amana-story.")
    expect(body.loginUrl).not.toContain("0001")
  })

  test("returns a generic 404 for an unknown workspace", async () => {
    const response = await handleWorkspaceSignInRequest(
      postWorkspace({ workspace: "XYZ-0001" }),
      lookups
    )
    const body = (await response.json()) as {
      error: { code: string; message: string }
    }

    expect(response.status).toBe(404)
    expect(body.error.message).toBe(WORKSPACE_NOT_FOUND_MESSAGE)
  })

  test("rejects an empty or malformed body", async () => {
    const empty = await handleWorkspaceSignInRequest(
      postWorkspace({ workspace: "  " }),
      lookups
    )
    const malformed = await handleWorkspaceSignInRequest(
      postWorkspace("{"),
      lookups
    )

    expect(empty.status).toBe(400)
    expect(malformed.status).toBe(400)
  })
})
