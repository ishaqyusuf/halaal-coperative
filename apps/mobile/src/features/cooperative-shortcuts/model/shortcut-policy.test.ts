import { describe, expect, test } from "bun:test"

import {
  createPendingShortcutStore,
  decideShortcutLaunch,
  describeShortcutState,
  PENDING_SHORTCUT_TTL_MS,
  resolveShortcutSwitch,
  shouldOfferCooperativeShortcut,
  type CooperativeWorkspace,
} from "./shortcut-policy"
import {
  emptyShortcutRegistry,
  upsertShortcutAssociation,
  type ShortcutAssociation,
} from "./shortcut-state"

const idA = `cs1-${"a".repeat(32)}`

const association: ShortcutAssociation = {
  label: "Barakah",
  mark: "BA",
  membershipId: "m-barakah-member",
  shortcutId: idA,
  status: "pin_observed",
  tenantId: "t-barakah",
  updatedAt: 1,
  userId: "user-a",
  variant: "production",
}
const registry = upsertShortcutAssociation(emptyShortcutRegistry(), association)
const base = {
  authInitializing: false,
  locked: false,
  online: true,
  profile: { tenantId: "t-amanah", userId: "user-a" },
  registry,
  shortcutId: idA,
  variant: "production",
}

function workspace(
  memberships: CooperativeWorkspace["memberships"]
): CooperativeWorkspace {
  return {
    isCurrent: false,
    memberships,
    tenant: { id: "t-barakah", logoUrl: null, mark: "BA", name: "Barakah" },
  }
}

describe("decideShortcutLaunch", () => {
  test("rejects malformed intents before reading any state", () => {
    expect(decideShortcutLaunch({ ...base, shortcutId: "../(admin)" })).toEqual(
      { kind: "invalid" }
    )
  })

  test("waits for hydration and app lock; signed-out taps go to sign-in", () => {
    expect(decideShortcutLaunch({ ...base, authInitializing: true }).kind).toBe(
      "wait"
    )
    expect(decideShortcutLaunch({ ...base, profile: null }).kind).toBe(
      "sign-in"
    )
    expect(decideShortcutLaunch({ ...base, locked: true }).kind).toBe("wait")
  })

  test("owner, variant and disabled mismatches resolve to neutral recovery", () => {
    expect(
      decideShortcutLaunch({
        ...base,
        profile: { tenantId: "t-barakah", userId: "user-b" },
      }).kind
    ).toBe("unknown")
    expect(decideShortcutLaunch({ ...base, variant: "preview" }).kind).toBe(
      "unknown"
    )
    expect(
      decideShortcutLaunch({
        ...base,
        registry: upsertShortcutAssociation(registry, {
          ...association,
          status: "disabled",
        }),
      }).kind
    ).toBe("unknown")
    expect(
      decideShortcutLaunch({ ...base, registry: emptyShortcutRegistry() }).kind
    ).toBe("unknown")
  })

  test("enters directly in the same cooperative; another needs online switching", () => {
    expect(
      decideShortcutLaunch({
        ...base,
        profile: { tenantId: "t-barakah", userId: "user-a" },
      }).kind
    ).toBe("enter")
    expect(decideShortcutLaunch({ ...base, online: false }).kind).toBe(
      "offline"
    )
    expect(decideShortcutLaunch(base)).toEqual({
      association,
      kind: "switch-needed",
    })
  })
})

describe("resolveShortcutSwitch", () => {
  const member = {
    id: "m-barakah-member",
    isDefault: false,
    role: "member",
    workspaceRole: "member" as const,
  }
  const admin = {
    id: "m-barakah-admin",
    isDefault: true,
    role: "tenant_admin",
    workspaceRole: "admin" as const,
  }

  test("uses the saved role only while it is still authorized", () => {
    expect(
      resolveShortcutSwitch(association, [workspace([admin, member])])
    ).toEqual({ kind: "switch", membershipId: "m-barakah-member" })
  })

  test("asks for a role instead of promoting to a default admin membership", () => {
    expect(
      resolveShortcutSwitch({ ...association, membershipId: "m-revoked" }, [
        workspace([admin, { ...member, id: "m-other" }]),
      ]).kind
    ).toBe("choose-role")
    expect(
      resolveShortcutSwitch({ ...association, membershipId: "m-revoked" }, [
        workspace([admin]),
      ])
    ).toEqual({ kind: "switch", membershipId: "m-barakah-admin" })
  })

  test("a removed membership or inactive cooperative is unavailable", () => {
    expect(resolveShortcutSwitch(association, []).kind).toBe("unavailable")
    expect(resolveShortcutSwitch(association, [workspace([])]).kind).toBe(
      "unavailable"
    )
  })
})

describe("shouldOfferCooperativeShortcut", () => {
  const offer = {
    accessAllowed: true,
    locked: false,
    mockSession: false,
    pathname: "/",
    profile: { tenantId: "t-amanah", userId: "user-a" },
    registry: emptyShortcutRegistry(),
    support: "supported" as const,
    variant: "production",
  }

  test("offers once per account and cooperative on the ordinary home", () => {
    expect(shouldOfferCooperativeShortcut(offer)).toBe(true)
    expect(
      shouldOfferCooperativeShortcut({
        ...offer,
        registry: upsertShortcutAssociation(emptyShortcutRegistry(), {
          ...association,
          shortcutId: null,
          status: "deferred",
          tenantId: "t-amanah",
        }),
      })
    ).toBe(false)
  })

  test("never offers before entry gates or on unsupported launchers", () => {
    for (const override of [
      { accessAllowed: false },
      { locked: true },
      { mockSession: true },
      { pathname: "/mobile-access" },
      { support: "unsupported_launcher" as const },
      { profile: null },
      { profile: { qaAuthorized: true, tenantId: "t", userId: "u" } },
    ]) {
      expect(shouldOfferCooperativeShortcut({ ...offer, ...override })).toBe(
        false
      )
    }
  })
})

describe("pending shortcut destination", () => {
  test("is consumed once and expires", () => {
    let now = 0
    const store = createPendingShortcutStore(() => now)
    store.set(idA)
    expect(store.take()).toBe(idA)
    expect(store.take()).toBeNull()

    store.set(idA)
    now = PENDING_SHORTCUT_TTL_MS + 1
    expect(store.peek()).toBeNull()

    store.set("not-an-id")
    expect(store.peek()).toBeNull()
  })
})

describe("describeShortcutState", () => {
  test("never claims deletion and distinguishes unsupported states", () => {
    const disabled = describeShortcutState({
      association: { ...association, status: "disabled" },
      support: "supported",
    })
    expect(disabled.description).toContain("You can remove its tile")
    expect(disabled.description.toLowerCase()).not.toContain("deleted")
    expect(
      describeShortcutState({ association: null, support: "unsupported_os" })
        .actions
    ).toEqual([])
    expect(
      describeShortcutState({
        association: { ...association, status: "request_sent" },
        support: "supported",
      }).actions
    ).toContain("retry")
  })
})
