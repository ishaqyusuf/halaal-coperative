import { describe, expect, test } from "bun:test"
import {
  fingerprint,
  parsePushRegistrationRecord,
  planPushRegistration,
  PUSH_REGISTRATION_TTL_MS,
  pushRegistrationScope,
  type PushRegistrationRecord,
} from "./push-registration-policy"

const now = Date.parse("2026-11-16T10:00:00.000Z")
const scope = pushRegistrationScope({
  membershipId: "membership-1",
  sessionToken: "session-token-1",
  tenantId: "tenant-1",
  userId: "user-1",
})
const granted: PushRegistrationRecord = {
  permission: "granted",
  scope,
  syncedAt: now - 60_000,
}

describe("push registration policy", () => {
  test("a resume with nothing changed makes no call", () => {
    expect(
      planPushRegistration({
        now,
        permission: "granted",
        record: granted,
        scope,
      })
    ).toBe("skip")
  })

  test("registers on first run, a new scope, or after a day", () => {
    expect(
      planPushRegistration({ now, permission: "granted", record: null, scope })
    ).toBe("register")
    const otherSession = pushRegistrationScope({
      membershipId: "membership-1",
      sessionToken: "session-token-2",
      tenantId: "tenant-1",
      userId: "user-1",
    })
    expect(
      planPushRegistration({
        now,
        permission: "granted",
        record: granted,
        scope: otherSession,
      })
    ).toBe("register")
    expect(
      planPushRegistration({
        now,
        permission: "granted",
        record: { ...granted, syncedAt: now - PUSH_REGISTRATION_TTL_MS },
        scope,
      })
    ).toBe("register")
  })

  test("a forced sync (prompt, retry, new provider token) always registers", () => {
    expect(
      planPushRegistration({
        force: true,
        now,
        permission: "granted",
        record: granted,
        scope,
      })
    ).toBe("register")
  })

  test("disables only when a granted registration is withdrawn", () => {
    expect(
      planPushRegistration({
        now,
        permission: "denied",
        record: granted,
        scope,
      })
    ).toBe("disable")
    expect(
      planPushRegistration({
        now,
        permission: "denied",
        record: { ...granted, permission: "denied" },
        scope,
      })
    ).toBe("skip")
    expect(
      planPushRegistration({
        now,
        permission: "undetermined",
        record: null,
        scope,
      })
    ).toBe("skip")
    expect(
      planPushRegistration({
        now,
        permission: "unavailable",
        record: granted,
        scope,
      })
    ).toBe("skip")
  })

  test("the scope never stores the session token", () => {
    expect(scope).not.toContain("session-token-1")
    expect(fingerprint("a")).not.toBe(fingerprint("b"))
    expect(fingerprint("same")).toBe(fingerprint("same"))
  })

  test("ignores a malformed stored record", () => {
    expect(parsePushRegistrationRecord(null)).toBeNull()
    expect(parsePushRegistrationRecord("{")).toBeNull()
    expect(
      parsePushRegistrationRecord(
        JSON.stringify({ permission: "maybe", scope, syncedAt: 1 })
      )
    ).toBeNull()
    expect(parsePushRegistrationRecord(JSON.stringify(granted))).toEqual(
      granted
    )
  })
})
