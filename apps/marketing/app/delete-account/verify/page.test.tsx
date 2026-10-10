import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import Page from "./page"

describe("public deletion verification route", () => {
  test("renders a no-token recovery path and the emailed challenge shell", async () => {
    const incomplete = renderToStaticMarkup(
      await Page({ searchParams: Promise.resolve({}) })
    )
    expect(incomplete).toContain("This verification link is incomplete")
    expect(incomplete).toContain("Request a new link")

    const challenge = renderToStaticMarkup(
      await Page({
        searchParams: Promise.resolve({
          challenge: "00000000-0000-4000-8000-000000000000",
        }),
      })
    )
    expect(challenge).toContain("Verify account deletion request")
    expect(challenge).toContain("Checking verification link…")
    expect(challenge).not.toContain("This verification link is incomplete")
  })
})
