import { describe, expect, test } from "bun:test"
import { FORBIDDEN_COPY, userFacingStrings } from "./check-no-billing-copy.mjs"

const flagged = (source) =>
  userFacingStrings("sample.tsx", source).filter(({ text }) => FORBIDDEN_COPY.test(text)).map(({ text }) => text)

describe("mobile billing-copy guard", () => {
  test("catches the wording the access gate and admin screens used to show", () => {
    expect(flagged(`const g = { body: "Your mobile access term has ended. Renew it from your web dashboard, then refresh here." }`)).toHaveLength(1)
    expect(flagged(`const g = { title: \`Turn it on from the web\`, path: "x", body: \`Turn it on from your web dashboard\` }`)).toHaveLength(1)
    expect(flagged(`const x = <Text>Subscription restriction</Text>`)).toHaveLength(1)
    expect(flagged(`const x = <Text>{ok ? m : "Plan restricted"}</Text>`)).toHaveLength(1)
    expect(flagged(`const x = <Sheet accessibilityHint="Explains the subscription requirement" />`)).toHaveLength(1)
    expect(flagged(`setSubmitError("Changes are unavailable while subscription access is restricted.")`)).toHaveLength(1)
    expect(flagged(`const p = { actionLabel: "View plan", detail: "Requires a higher reporting plan." }`)).toHaveLength(2)
  })

  test("ignores code identifiers and cooperative finance wording", () => {
    expect(flagged(`const subscription = AppState.addEventListener("change", f); subscription.remove()`)).toEqual([])
    expect(flagged(`const s = snapshot.subscription.accessEnabled; if (qaState === "subscription") {}`)).toEqual([])
    expect(flagged(`const x = <Text>Unit price</Text>`)).toEqual([])
    expect(flagged(`const x = <Text>Your plan position is unavailable</Text>`)).toEqual([])
    expect(flagged(`const p = { label: "Term", value: "12 months" }`)).toEqual([])
  })
})
