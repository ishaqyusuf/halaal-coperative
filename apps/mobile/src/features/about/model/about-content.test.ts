import { describe, expect, test } from "bun:test"
import { resolvePublicSiteOrigin } from "@/lib/public-site-origin"
import {
  formatAppVersion,
  siteLabel,
  visibleSocialAccounts,
} from "./about-content"

describe("about content", () => {
  test("formats the version with its build when known", () => {
    expect(formatAppVersion("1.4.0", "112")).toBe("1.4.0 (112)")
    expect(formatAppVersion("1.4.0", null)).toBe("1.4.0")
    expect(formatAppVersion(undefined, " ")).toBe("Unknown")
  })

  test("hides social accounts without a handle or an https link", () => {
    const accounts = visibleSocialAccounts([
      { handle: "@halaalvest", icon: "Instagram", key: "ig", label: "Instagram", url: "https://instagram.com/halaalvest" },
      { handle: "", icon: "Twitter", key: "x", label: "X", url: "https://x.com/halaalvest" },
      { handle: "HalaalVest", icon: "Linkedin", key: "li", label: "LinkedIn", url: "http://linkedin.com" },
    ])
    expect(accounts.map((a) => a.key)).toEqual(["ig"])
  })

  test("labels the site by its host", () => {
    expect(siteLabel("https://www.halaalvest.com")).toBe("halaalvest.com")
  })

  test("opens only a safe public https origin", () => {
    expect(resolvePublicSiteOrigin("https://halaalvest.com/")).toBe(
      "https://halaalvest.com"
    )
    expect(resolvePublicSiteOrigin("http://halaalvest.com")).toBeNull()
    expect(resolvePublicSiteOrigin("https://halaalvest.com/terms")).toBeNull()
    expect(resolvePublicSiteOrigin("https://app.localhost")).toBeNull()
    expect(resolvePublicSiteOrigin(undefined)).toBeNull()
  })
})
