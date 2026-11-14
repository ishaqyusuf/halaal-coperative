import { describe, expect, test } from "bun:test"
import { assistantNativeRoute } from "./assistant-link-route"

describe("assistantNativeRoute", () => {
  test("maps member answer links to member screens", () => {
    expect(assistantNativeRoute("/loans", "member")).toEqual({
      kind: "native",
      href: "/(member)/(tabs)/financing",
    })
    expect(
      assistantNativeRoute("/payment-receipts?receiptId=rc_1", "member")
    ).toEqual({ kind: "native", href: "/(member)/receipts" })
    expect(assistantNativeRoute("/contributions", "member")).toEqual({
      kind: "native",
      href: "/(member)/(tabs)/commitments",
    })
  })

  test("maps staff member links to the admin member detail", () => {
    expect(assistantNativeRoute("/members/m_1", "staff")).toEqual({
      kind: "native",
      href: "/(admin)/members/m_1",
    })
    expect(assistantNativeRoute("/members", "staff")).toEqual({
      kind: "native",
      href: "/(admin)/(tabs)/members",
    })
  })

  test("never opens staff screens for members", () => {
    expect(assistantNativeRoute("/members/m_1", "member")).toEqual({
      kind: "web",
      path: "/members/m_1",
    })
  })

  test("keeps unknown or unsafe paths off native", () => {
    expect(assistantNativeRoute("/reports/audit", "staff")).toEqual({
      kind: "web",
      path: "/reports/audit",
    })
    expect(assistantNativeRoute("//evil.example/loans", "member")).toBeNull()
    expect(assistantNativeRoute("https://evil.example", "member")).toBeNull()
    expect(assistantNativeRoute("/members/..%2Fx", "staff")).toEqual({
      kind: "web",
      path: "/members/..%2Fx",
    })
  })
})
