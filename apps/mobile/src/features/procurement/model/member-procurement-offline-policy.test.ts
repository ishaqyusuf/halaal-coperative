import { describe, expect, it } from "bun:test"
import {
  canStartMemberProcurementRequest,
  runOfflineSafeProcurementRecovery,
} from "./member-procurement-offline-policy"

describe("member procurement offline policy", () => {
  it("suppresses request entry while offline", () => {
    expect(
      canStartMemberProcurementRequest({
        canCreateRequest: true,
        isOffline: true,
        isStale: true,
      })
    ).toBe(false)
  })

  it("does not call transport-backed recovery in deterministic offline QA", async () => {
    let retryCalls = 0

    await runOfflineSafeProcurementRecovery({
      isQaOffline: true,
      retry: async () => {
        retryCalls += 1
      },
    })

    expect(retryCalls).toBe(0)
  })

  it("allows runtime recovery outside the deterministic QA override", async () => {
    let retryCalls = 0

    await runOfflineSafeProcurementRecovery({
      isQaOffline: false,
      retry: async () => {
        retryCalls += 1
      },
    })

    expect(retryCalls).toBe(1)
  })
})
