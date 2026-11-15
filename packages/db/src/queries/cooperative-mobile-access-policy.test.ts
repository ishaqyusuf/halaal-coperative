import { describe, expect, test } from "bun:test"
import {
  decideMemberAccept,
  decideMemberTurnOff,
  memberAccessActions,
  type MemberTermLike,
} from "./cooperative-mobile-access-policy"

const now = new Date("2026-11-15T12:00:00.000Z")
const on = { enabled: true, selfService: true }
const review = { enabled: true, selfService: false }
const paused = { enabled: false, selfService: true }

function term(overrides: Partial<MemberTermLike> = {}): MemberTermLike {
  return {
    status: "approved",
    startsAt: new Date("2026-11-01T00:00:00.000Z"),
    endsAt: new Date("2027-11-01T00:00:00.000Z"),
    revokedByMember: false,
    ...overrides,
  }
}

const ended = term({
  startsAt: new Date("2025-10-01T00:00:00.000Z"),
  endsAt: new Date("2026-10-01T00:00:00.000Z"),
})
const pending = term({ status: "pending", startsAt: null, endsAt: null })

describe("decideMemberAccept", () => {
  test("self-service turns a new term on at once", () => {
    expect(decideMemberAccept(null, now, on)).toEqual({
      kind: "create",
      status: "approved",
    })
  })

  test("without self-service a new term waits for approval", () => {
    expect(decideMemberAccept(null, now, review)).toEqual({
      kind: "create",
      status: "pending",
    })
  })

  test("a waiting request is turned on in place once self-service is on", () => {
    expect(decideMemberAccept(pending, now, on)).toEqual({
      kind: "approve_pending",
    })
    expect(decideMemberAccept(pending, now, review)).toEqual({
      kind: "unchanged",
    })
  })

  test("accepting while already on changes nothing", () => {
    expect(decideMemberAccept(term(), now, on)).toEqual({ kind: "unchanged" })
  })

  test("an ended or declined term starts a new one", () => {
    expect(decideMemberAccept(ended, now, on).kind).toBe("create")
    expect(
      decideMemberAccept(
        term({ status: "rejected", startsAt: null, endsAt: null }),
        now,
        on
      ).kind
    ).toBe("create")
  })

  test("a member who turned it off can turn it back on, even while paused", () => {
    const off = term({ status: "revoked", revokedByMember: true })
    expect(decideMemberAccept(off, now, on)).toEqual({ kind: "reinstate" })
    expect(decideMemberAccept(off, now, paused)).toEqual({ kind: "reinstate" })
  })

  test("a member the cooperative turned off is blocked", () => {
    expect(
      decideMemberAccept(term({ status: "revoked" }), now, on)
    ).toEqual({ kind: "blocked", reason: "cooperative_turned_off" })
  })

  test("a paused cooperative blocks new terms", () => {
    expect(decideMemberAccept(null, now, paused)).toEqual({
      kind: "blocked",
      reason: "not_enabled",
    })
    expect(decideMemberAccept(pending, now, paused).kind).toBe("blocked")
  })
})

describe("decideMemberTurnOff", () => {
  test("only access that is on now can be turned off", () => {
    expect(decideMemberTurnOff(term(), now)).toEqual({ kind: "revoke" })
    expect(decideMemberTurnOff(null, now)).toEqual({ kind: "blocked" })
    expect(decideMemberTurnOff(ended, now)).toEqual({ kind: "blocked" })
    expect(decideMemberTurnOff(pending, now)).toEqual({ kind: "blocked" })
  })

  test("turning off twice changes nothing", () => {
    expect(
      decideMemberTurnOff(term({ status: "revoked", revokedByMember: true }), now)
    ).toEqual({ kind: "unchanged" })
  })
})

describe("memberAccessActions", () => {
  test("offers turn on to a member with no term", () => {
    expect(memberAccessActions(null, now, on)).toEqual({
      canAccept: true,
      acceptTurnsOn: true,
      canTurnBackOn: false,
      canTurnOff: false,
      turnedOffBy: null,
    })
  })

  test("offers ask, not turn on, without self-service", () => {
    const actions = memberAccessActions(null, now, review)
    expect(actions.canAccept).toBe(true)
    expect(actions.acceptTurnsOn).toBe(false)
  })

  test("says who turned access off", () => {
    expect(
      memberAccessActions(
        term({ status: "revoked", revokedByMember: true }),
        now,
        on
      )
    ).toMatchObject({ canTurnBackOn: true, turnedOffBy: "member" })
    expect(
      memberAccessActions(term({ status: "revoked" }), now, on)
    ).toMatchObject({
      canAccept: false,
      canTurnBackOn: false,
      turnedOffBy: "cooperative",
    })
  })

  test("offers turn off while on", () => {
    expect(memberAccessActions(term(), now, on)).toMatchObject({
      canAccept: false,
      canTurnOff: true,
    })
  })
})
