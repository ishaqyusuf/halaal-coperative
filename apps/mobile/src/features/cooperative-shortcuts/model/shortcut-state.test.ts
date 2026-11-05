import { describe, expect, test } from "bun:test"

import {
  beginShortcutSignOutCleanup,
  completeShortcutCleanup,
  emptyShortcutRegistry,
  findShortcutAssociation,
  MAX_SHORTCUT_ASSOCIATIONS,
  parseShortcutRegistry,
  planShortcutReconcile,
  upsertShortcutAssociation,
  type ShortcutAssociation,
} from "./shortcut-state"

const idA = `cs1-${"a".repeat(32)}`
const idB = `cs1-${"b".repeat(32)}`
const idC = `cs1-${"c".repeat(32)}`

function association(
  overrides: Partial<ShortcutAssociation> = {}
): ShortcutAssociation {
  return {
    label: "Amanah",
    mark: "AM",
    membershipId: "m-amanah",
    shortcutId: idA,
    status: "pin_observed",
    tenantId: "t-amanah",
    updatedAt: 1,
    userId: "user-a",
    variant: "production",
    ...overrides,
  }
}

const owner = {
  activeMembershipId: "m-amanah",
  tenantId: "t-amanah",
  userId: "user-a",
}

describe("shortcut registry persistence", () => {
  test("round-trips valid data and drops tampered entries", () => {
    const registry = upsertShortcutAssociation(
      emptyShortcutRegistry(),
      association()
    )
    expect(parseShortcutRegistry(JSON.stringify(registry))).toEqual(registry)

    const tampered = JSON.stringify({
      associations: [
        association({ shortcutId: "../(admin)" }),
        { ...association({ shortcutId: idB }), token: "secret" },
        association({ shortcutId: null, status: "pin_observed" }),
      ],
      tombstones: [{ shortcutId: "bad" }, { shortcutId: idC }],
      version: 1,
    })
    const parsed = parseShortcutRegistry(tampered)
    expect(parsed.associations.map((item) => item.shortcutId)).toEqual([idB])
    expect(JSON.stringify(parsed)).not.toContain("secret")
    expect(parsed.tombstones).toEqual([
      { shortcutId: idC, status: "cleanup_pending" },
    ])
  })

  test("fails closed on unreadable or unknown-version data", () => {
    expect(parseShortcutRegistry("{")).toEqual(emptyShortcutRegistry())
    expect(parseShortcutRegistry('{"version":2}')).toEqual(
      emptyShortcutRegistry()
    )
    expect(parseShortcutRegistry(null)).toEqual(emptyShortcutRegistry())
  })

  test("keeps one association per account, cooperative and variant", () => {
    let registry = upsertShortcutAssociation(
      emptyShortcutRegistry(),
      association()
    )
    registry = upsertShortcutAssociation(
      registry,
      association({ membershipId: "m-amanah-admin", status: "request_sent" })
    )
    expect(registry.associations).toHaveLength(1)
    expect(
      findShortcutAssociation(registry, {
        tenantId: "t-amanah",
        userId: "user-a",
        variant: "production",
      })?.membershipId
    ).toBe("m-amanah-admin")
    expect(
      findShortcutAssociation(registry, {
        tenantId: "t-amanah",
        userId: "user-a",
        variant: "preview",
      })
    ).toBeNull()
  })

  test("bounds the registry without dropping the newest association", () => {
    let registry = emptyShortcutRegistry()
    for (let index = 0; index < MAX_SHORTCUT_ASSOCIATIONS + 3; index += 1) {
      registry = upsertShortcutAssociation(
        registry,
        association({
          shortcutId: null,
          status: "deferred",
          tenantId: `t-${index}`,
        })
      )
    }
    expect(registry.associations).toHaveLength(MAX_SHORTCUT_ASSOCIATIONS)
    expect(registry.associations[0]?.tenantId).toBe(
      `t-${MAX_SHORTCUT_ASSOCIATIONS + 2}`
    )
  })
})

describe("shortcut sign-out cleanup", () => {
  test("erases mappings before native work and keeps only opaque ids", () => {
    let registry = upsertShortcutAssociation(
      emptyShortcutRegistry(),
      association()
    )
    registry = upsertShortcutAssociation(
      registry,
      association({ shortcutId: null, status: "deferred", tenantId: "t-b" })
    )
    const cleanup = beginShortcutSignOutCleanup(registry)

    expect(cleanup.disableIds).toEqual([idA])
    expect(cleanup.registry.associations).toEqual([])
    expect(JSON.stringify(cleanup.registry)).not.toContain("user-a")
    expect(JSON.stringify(cleanup.registry)).not.toContain("Amanah")
    expect(completeShortcutCleanup(cleanup.registry, [idA]).tombstones).toEqual(
      []
    )
  })

  test("a failed native disable leaves the tombstone for the next start", () => {
    const cleanup = beginShortcutSignOutCleanup(
      upsertShortcutAssociation(emptyShortcutRegistry(), association())
    )
    const restarted = parseShortcutRegistry(JSON.stringify(cleanup.registry))
    const plan = planShortcutReconcile({
      now: 2,
      observedIds: [],
      owner: null,
      pinned: null,
      registry: restarted,
      variant: "production",
    })
    expect(plan.disableIds).toEqual([idA])
  })
})

describe("shortcut reconciliation", () => {
  test("signed out: disables every enabled pin, including late approvals", () => {
    const plan = planShortcutReconcile({
      now: 2,
      observedIds: [idB],
      owner: null,
      pinned: [
        { enabled: true, id: idB },
        { enabled: false, id: idC },
      ],
      registry: emptyShortcutRegistry(),
      variant: "production",
    })
    expect(plan.disableIds).toEqual([idB])
    expect(plan.registry.associations).toEqual([])
  })

  test("a different account cannot adopt the previous account's shortcut", () => {
    const registry = upsertShortcutAssociation(
      emptyShortcutRegistry(),
      association({ userId: "user-previous" })
    )
    const plan = planShortcutReconcile({
      now: 2,
      observedIds: [],
      owner,
      pinned: [{ enabled: true, id: idA }],
      registry,
      variant: "production",
    })
    expect(plan.disableIds).toEqual([idA])
    expect(plan.registry.associations).toEqual([])
  })

  test("disables unknown restored pins but keeps the owner's active ones", () => {
    const registry = upsertShortcutAssociation(
      emptyShortcutRegistry(),
      association({ status: "request_sent" })
    )
    const plan = planShortcutReconcile({
      now: 5,
      observedIds: [idA],
      owner,
      pinned: [
        { enabled: true, id: idA },
        { enabled: true, id: idB },
      ],
      registry,
      variant: "production",
    })
    expect(plan.disableIds).toEqual([idB])
    expect(plan.registry.associations[0]?.status).toBe("pin_observed")
  })

  test("keeps a disabled own shortcut disabled and tracks user removal", () => {
    let registry = upsertShortcutAssociation(
      emptyShortcutRegistry(),
      association({ status: "disabled" })
    )
    registry = upsertShortcutAssociation(
      registry,
      association({ shortcutId: idB, tenantId: "t-b" })
    )
    const plan = planShortcutReconcile({
      now: 5,
      observedIds: [],
      owner,
      pinned: [{ enabled: true, id: idA }],
      registry,
      variant: "production",
    })
    expect(plan.disableIds).toEqual([idA])
    const byId = new Map(
      plan.registry.associations.map((item) => [item.shortcutId, item.status])
    )
    expect(byId.get(idA)).toBe("disabled")
    expect(byId.get(idB)).toBe("deferred")
  })

  test("remembers the explicit role chosen in the current cooperative", () => {
    const plan = planShortcutReconcile({
      now: 5,
      observedIds: [],
      owner: { ...owner, activeMembershipId: "m-amanah-admin" },
      pinned: null,
      registry: upsertShortcutAssociation(
        emptyShortcutRegistry(),
        association()
      ),
      variant: "production",
    })
    expect(plan.registry.associations[0]?.membershipId).toBe("m-amanah-admin")
    expect(plan.registry.associations[0]?.status).toBe("pin_observed")
  })
})
