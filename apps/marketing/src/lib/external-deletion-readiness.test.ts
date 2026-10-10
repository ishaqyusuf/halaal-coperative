import { describe, expect, test } from "bun:test"
import { canStartExternalDeletionRequest } from "./external-deletion-readiness"

const ready = {
  appEnv: "preview",
  challengeSecretLength: 32,
  databaseConfigured: true,
  emailConfigured: true,
  emailMode: "console",
  nodeEnv: "production",
  originConfigured: true,
  qaDomainRouteConfigured: true,
}

describe("external deletion request visibility", () => {
  test("hides the form when a production-mode target is incomplete", () => {
    for (const change of [
      { appEnv: undefined },
      { challengeSecretLength: 31 },
      { databaseConfigured: false },
      { emailConfigured: false },
      { originConfigured: false },
      { qaDomainRouteConfigured: false },
    ]) {
      expect(canStartExternalDeletionRequest({ ...ready, ...change })).toBe(
        false
      )
    }
  })

  test("requires live routing in Production and a QA route in Preview", () => {
    expect(canStartExternalDeletionRequest(ready)).toBe(true)
    expect(
      canStartExternalDeletionRequest({
        ...ready,
        emailMode: "live",
      })
    ).toBe(false)
    expect(
      canStartExternalDeletionRequest({
        ...ready,
        appEnv: "production",
        emailMode: "console",
      })
    ).toBe(false)
    expect(
      canStartExternalDeletionRequest({
        ...ready,
        appEnv: "production",
        emailMode: "live",
        qaDomainRouteConfigured: false,
      })
    ).toBe(true)
  })
})
