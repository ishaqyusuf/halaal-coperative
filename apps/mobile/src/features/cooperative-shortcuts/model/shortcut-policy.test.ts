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
  addShortcutDeferral,
  emptyShortcutRegistry,
  upsertShortcutAssociation,
  type ShortcutAssociation,
} from "./shortcut-state"

const idA = `cs1-${"a".repeat(32)}`

const association: ShortcutAssociation = {
  label: "Barakah",
  mark: "BA",
  shortcutId: idA,
  status: "pin_observed",
  tenantId: "t-barakah",
  updatedAt: 1,
  variant: "production",
}
const registry = upsertShortcutAssociation(emptyShortcutRegistry(), association)
const base = {
  authInitializing: false,
  locked: false,
  online: true,
  profile: { tenantId: "t-amanah" },
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

  test("variant, disabled and unknown ids resolve to neutral recovery", () => {
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

  test("any account of the cooperative enters; another needs online switching", () => {
    // The shortcut belongs to the phone, so the admin's tile serves the
    // member too.
    expect(
      decideShortcutLaunch({ ...base, profile: { tenantId: "t-barakah" } }).kind
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

  test("asks for a role instead of promoting to a default admin membership", () => {
    expect(
      resolveShortcutSwitch(association, [workspace([admin, member])]).kind
    ).toBe("choose-role")
    expect(resolveShortcutSwitch(association, [workspace([member])])).toEqual({
      kind: "switch",
      membershipId: "m-barakah-member",
    })
  })

  test("an account outside the cooperative is unavailable", () => {
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

  test("is not offered again once the cooperative has a shortcut, whoever signs in", () => {
    expect(shouldOfferCooperativeShortcut(offer)).toBe(true)
    const added = upsertShortcutAssociation(emptyShortcutRegistry(), {
      ...association,
      tenantId: "t-amanah",
    })
    // The admin added it; the member of the same cooperative is not asked.
    expect(shouldOfferCooperativeShortcut({ ...offer, registry: added })).toBe(
      false
    )
    expect(
      shouldOfferCooperativeShortcut({
        ...offer,
        profile: { tenantId: "t-amanah", userId: "user-b" },
        registry: added,
      })
    ).toBe(false)
    // Another cooperative on the same phone still gets its own offer.
    expect(
      shouldOfferCooperativeShortcut({
        ...offer,
        profile: { tenantId: "t-other", userId: "user-b" },
        registry: added,
      })
    ).toBe(true)
  })

  test("\"Not now\" quiets the offer only for the account that said it", () => {
    const deferred = addShortcutDeferral(emptyShortcutRegistry(), {
      tenantId: "t-amanah",
      updatedAt: 1,
      userId: "user-a",
      variant: "production",
    })
    expect(
      shouldOfferCooperativeShortcut({ ...offer, registry: deferred })
    ).toBe(false)
    expect(
      shouldOfferCooperativeShortcut({
        ...offer,
        profile: { tenantId: "t-amanah", userId: "user-b" },
        registry: deferred,
      })
    ).toBe(true)
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
    expect(disabled.description).toContain("remove its tile")
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
