/**
 * Quick Fill is web-first (triage 5.11, 16 Nov 2026): on mobile it is QA
 * tooling only. Every placement, the form footer included, needs a QA client
 * build plus a QA-authorized session or device; ordinary signed-in users in a
 * Preview build never see it.
 */
export function shouldShowDevQuickFill(input: {
  hasDeviceQaAuthorization: boolean
  isDevFixtureSession: boolean
  isFocused: boolean
  isKeyboardVisible: boolean
  isQaClientBuild: boolean
  placement: "floating" | "footer"
  sessionQaAuthorized: boolean
}) {
  if (!input.isQaClientBuild || input.isKeyboardVisible) return false
  if (
    !input.isDevFixtureSession &&
    !input.sessionQaAuthorized &&
    !input.hasDeviceQaAuthorization
  )
    return false
  // A footer control lives inside its own form, which is focused while shown.
  return input.placement === "footer" || input.isFocused
}
