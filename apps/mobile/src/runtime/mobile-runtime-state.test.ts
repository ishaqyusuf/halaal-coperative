import { describe, expect, test } from "bun:test"
import {
  canDeliverMobileOperation,
  initialMobileRuntimeState,
  isUnauthorizedMobileSessionError,
  mobileRuntimeReducer,
  MobileOfflineOperationError,
  shouldRefreshMobileReads,
} from "./mobile-runtime-state"

describe("mobile runtime state", () => {
  test("moves through hydration, authentication, offline, reconnect, and retry", () => {
    const hydrating = mobileRuntimeReducer(initialMobileRuntimeState, {
      error: false,
      hasProfile: false,
      hydrating: true,
      type: "auth",
    })
    expect(hydrating.session).toBe("hydrating")

    const authenticated = mobileRuntimeReducer(hydrating, {
      error: false,
      hasProfile: true,
      hydrating: false,
      type: "auth",
    })
    const offline = mobileRuntimeReducer(authenticated, {
      occurredAt: "2026-08-11T10:00:00.000Z",
      online: false,
      type: "connectivity",
    })
    expect(offline.connectivity).toBe("offline")
    expect(offline.freshness).toBe("stale")

    const online = mobileRuntimeReducer(offline, {
      occurredAt: "2026-08-11T10:01:00.000Z",
      online: true,
      type: "connectivity",
    })
    expect(online.connectivity).toBe("online")
    expect(online.freshness).toBe("fresh")
    expect(online.lastOnlineAt).toBe("2026-08-11T10:01:00.000Z")

    const retrying = mobileRuntimeReducer(online, {
      recovery: "retrying",
      type: "recovery",
    })
    expect(retrying.recovery).toBe("retrying")
  })

  test("keeps an authenticated cached profile on hydration failure", () => {
    const state = mobileRuntimeReducer(initialMobileRuntimeState, {
      error: true,
      hasProfile: true,
      hydrating: false,
      type: "auth",
    })
    expect(state.session).toBe("authenticated")
  })

  test("exposes fatal startup when hydration fails without a cached profile", () => {
    const state = mobileRuntimeReducer(initialMobileRuntimeState, {
      error: true,
      hasProfile: false,
      hydrating: false,
      type: "auth",
    })
    expect(state.session).toBe("fatal")
  })

  test("never permits events or commands into an offline queue", () => {
    expect(canDeliverMobileOperation("read", "offline")).toBe(true)
    expect(canDeliverMobileOperation("event", "offline")).toBe(false)
    expect(canDeliverMobileOperation("command", "offline")).toBe(false)
    expect(canDeliverMobileOperation("financial-command", "offline")).toBe(
      false
    )
    expect(new MobileOfflineOperationError("financial-command").code).toBe(
      "MOBILE_ONLINE_REQUIRED"
    )
  })

  test("recognizes expired signed credentials without treating network errors as logout", () => {
    expect(
      isUnauthorizedMobileSessionError({ data: { code: "UNAUTHORIZED" } })
    ).toBe(true)
    expect(
      isUnauthorizedMobileSessionError({
        shape: { data: { code: "UNAUTHORIZED" } },
      })
    ).toBe(true)
    expect(
      isUnauthorizedMobileSessionError(new Error("Network request failed"))
    ).toBe(false)
  })

  test("refreshes reads once on reconnect or foreground without replaying commands", () => {
    expect(
      shouldRefreshMobileReads({
        becameActive: false,
        online: true,
        reconnected: true,
      })
    ).toBe(true)
    expect(
      shouldRefreshMobileReads({
        becameActive: true,
        online: true,
        reconnected: false,
      })
    ).toBe(true)
    expect(
      shouldRefreshMobileReads({
        becameActive: true,
        online: false,
        reconnected: false,
      })
    ).toBe(false)
  })
})
