import { describe, expect, test } from "bun:test"

import {
  addShortcutDeferral,
  completeShortcutCleanup,
  emptyShortcutRegistry,
  findShortcutAssociation,
  hasShortcutDeferral,
  MAX_SHORTCUT_ASSOCIATIONS,
  parseShortcutRegistry,
  planShortcutReconcile,
  queueShortcutCleanup,
  upsertShortcutAssociation,
  type ShortcutAssociation,
} from "./shortcut-state"

const idA = `cs1-${"a".repeat(32)}`
const idB = `cs1-${"b".repeat(32)}`
const idC = `cs1-${"c".repeat(32)}`
const idD = `cs1-${"d".repeat(32)}`

function association(
  overrides: Partial<ShortcutAssociation> = {}
): ShortcutAssociation {
  return {
    label: "Amanah",
    mark: "AM",
    shortcutId: idA,
    status: "pin_observed",
    tenantId: "t-amanah",
    updatedAt: 1,
    variant: "production",
    ...overrides,
  }
}

function reconcile(
  input: Partial<Parameters<typeof planShortcutReconcile>[0]> = {}
) {
  return planShortcutReconcile({
    now: 50,
    observedIds: [],
    owner: null,
    pinned: [],
    registry: emptyShortcutRegistry(),
    variant: "production",
    ...input,
  })
}

describe("shortcut registry persistence", () => {
  test("round-trips valid data and drops tampered entries", () => {
    const registry = addShortcutDeferral(
      upsertShortcutAssociation(emptyShortcutRegistry(), association()),
      { tenantId: "t-other", updatedAt: 1, userId: "user-a", variant: "production" }
    )
    expect(parseShortcutRegistry(JSON.stringify(registry))).toEqual(registry)

    const tampered = JSON.stringify({
      associations: [
        association({ shortcutId: "../(admin)" }),
        { ...association({ shortcutId: idB }), token: "secret" },
        association({ shortcutId: idC, status: "deferred" as never }),
      ],
      deferrals: [{ tenantId: "t", userId: 7 }],
      tombstones: [{ shortcutId: "bad" }, { shortcutId: idC }],
      version: 2,
    })
    const parsed = parseShortcutRegistry(tampered)
    expect(parsed.associations.map((item) => item.shortcutId)).toEqual([idB])
    expect(JSON.stringify(parsed)).not.toContain("secret")
    expect(parsed.deferrals).toEqual([])
    expect(parsed.tombstones).toEqual([
      { shortcutId: idC, status: "cleanup_pending" },
    ])
  })

  test("fails closed on unreadable or unknown-version data", () => {
    expect(parseShortcutRegistry("{")).toEqual(emptyShortcutRegistry())
    expect(parseShortcutRegistry('{"version":3}')).toEqual(
      emptyShortcutRegistry()
    )
    expect(parseShortcutRegistry(null)).toEqual(emptyShortcutRegistry())
  })

  test("migrates v1 account shortcuts to one shortcut per cooperative", () => {
    const v1 = {
      associations: [
        // The member's request for the same cooperative loses to the
        // admin's pinned tile and is queued for disable.
        {
          ...association({ shortcutId: idB, status: "request_sent", updatedAt: 9 }),
          membershipId: "m-member",
          userId: "user-b",
        },
        { ...association(), membershipId: "m-admin", userId: "user-a" },
        {
          ...association({ shortcutId: null as never, status: "deferred" as never, tenantId: "t-other" }),
          membershipId: "m-other",
          userId: "user-a",
        },
        {
          ...association({ shortcutId: idC, status: "deferred" as never, tenantId: "t-third" }),
          membershipId: "m-third",
          userId: "user-a",
        },
      ],
      tombstones: [{ shortcutId: idD, status: "cleanup_pending" }],
      version: 1,
    }
    const parsed = parseShortcutRegistry(JSON.stringify(v1))

    expect(parsed.version).toBe(2)
    expect(
      parsed.associations.map((item) => [item.tenantId, item.shortcutId, item.status])
    ).toEqual([
      ["t-third", idC, "removed"],
      ["t-amanah", idA, "pin_observed"],
    ])
    expect(JSON.stringify(parsed.associations)).not.toContain("user-")
    expect(parsed.deferrals).toEqual([
      { tenantId: "t-other", updatedAt: 1, userId: "user-a", variant: "production" },
    ])
    expect(parsed.tombstones.map((item) => item.shortcutId)).toEqual([idD, idB])
  })

  test("keeps one shortcut per cooperative and variant", () => {
    let registry = upsertShortcutAssociation(
      emptyShortcutRegistry(),
      association()
    )
    registry = upsertShortcutAssociation(
      registry,
      association({ status: "request_sent", updatedAt: 2 })
    )
    expect(registry.associations).toHaveLength(1)
    registry = upsertShortcutAssociation(
      registry,
      association({ shortcutId: idB, variant: "preview" })
    )
    expect(registry.associations).toHaveLength(2)
    expect(
      findShortcutAssociation(registry, {
        tenantId: "t-amanah",
        variant: "preview",
      })?.shortcutId
    ).toBe(idB)
  })

  test("caps shortcuts by dropping one that is no longer live first", () => {
    let registry = upsertShortcutAssociation(
      emptyShortcutRegistry(),
      association({ shortcutId: idB, status: "removed", tenantId: "t-removed" })
    )
    for (let index = 0; index < MAX_SHORTCUT_ASSOCIATIONS; index += 1) {
      registry = upsertShortcutAssociation(
        registry,
        association({
          shortcutId: `cs1-${index.toString(16).padStart(32, "0")}`,
          tenantId: `t-${index}`,
        })
      )
    }
    expect(registry.associations).toHaveLength(MAX_SHORTCUT_ASSOCIATIONS)
    expect(
      registry.associations.some((item) => item.tenantId === "t-removed")
    ).toBe(false)
  })

  test("deferrals are per account and not duplicated", () => {
    const deferral = {
      tenantId: "t-amanah",
      updatedAt: 1,
      userId: "user-a",
      variant: "production",
    }
    let registry = addShortcutDeferral(emptyShortcutRegistry(), deferral)
    registry = addShortcutDeferral(registry, deferral)
    expect(registry.deferrals).toHaveLength(1)
    expect(hasShortcutDeferral(registry, deferral)).toBe(true)
    expect(hasShortcutDeferral(registry, { ...deferral, userId: "user-b" })).toBe(
      false
    )
  })

  test("cleanup queues ids and clears only the disabled ones", () => {
    const queued = queueShortcutCleanup(emptyShortcutRegistry(), [idA, idB, idA])
    expect(queued.tombstones.map((item) => item.shortcutId)).toEqual([idA, idB])
    expect(
      completeShortcutCleanup(queued, [idA]).tombstones.map(
        (item) => item.shortcutId
      )
    ).toEqual([idB])
  })
})

describe("planShortcutReconcile", () => {
  test("signing out leaves a cooperative's shortcut on", () => {
    const registry = upsertShortcutAssociation(
      emptyShortcutRegistry(),
      association()
    )
    const plan = reconcile({
      owner: null,
      pinned: [{ enabled: true, id: idA }],
      registry,
    })
    expect(plan.disableIds).toEqual([])
    expect(plan.reviveIds).toEqual([])
    expect(plan.registry.associations[0]?.status).toBe("pin_observed")
  })

  test("advances approved pins and marks a removed tile", () => {
    const registry = upsertShortcutAssociation(
      upsertShortcutAssociation(
        emptyShortcutRegistry(),
        association({ shortcutId: idB, status: "request_sent", tenantId: "t-b" })
      ),
      association()
    )
    const plan = reconcile({ observedIds: [idB], pinned: [], registry })
    const byTenant = Object.fromEntries(
      plan.registry.associations.map((item) => [item.tenantId, item.status])
    )
    expect(byTenant).toEqual({ "t-amanah": "removed", "t-b": "pin_observed" })
  })

  test("does not mark tiles removed when the launcher list is unreadable", () => {
    const registry = upsertShortcutAssociation(
      emptyShortcutRegistry(),
      association()
    )
    const plan = reconcile({ pinned: null, registry })
    expect(plan.registry.associations[0]?.status).toBe("pin_observed")
  })

  test("revives a tile the launcher shows disabled while the registry is live", () => {
    const registry = upsertShortcutAssociation(
      emptyShortcutRegistry(),
      association({ status: "request_sent" })
    )
    const plan = reconcile({ pinned: [{ enabled: false, id: idA }], registry })
    expect(plan.reviveIds).toEqual([idA])
    expect(plan.registry.associations[0]?.status).toBe("pin_observed")
  })

  test("keeps a user-disabled shortcut off", () => {
    const registry = upsertShortcutAssociation(
      emptyShortcutRegistry(),
      association({ status: "disabled" })
    )
    expect(
      reconcile({ pinned: [{ enabled: false, id: idA }], registry }).reviveIds
    ).toEqual([])
    expect(
      reconcile({ pinned: [{ enabled: true, id: idA }], registry }).disableIds
    ).toEqual([idA])
  })

  test("recovers pins that carry their cooperative after storage loss", () => {
    const plan = reconcile({
      pinned: [
        { enabled: true, id: idA, label: "Amanah", mark: "AM", tenantId: "t-amanah" },
        { enabled: false, id: idB, label: "Barakah", mark: "BA", tenantId: "t-barakah" },
        // A stray second tile for a cooperative that already has one.
        { enabled: true, id: idC, label: "Amanah", tenantId: "t-amanah" },
      ],
    })
    expect(
      plan.registry.associations.map((item) => [item.tenantId, item.shortcutId, item.status])
    ).toEqual([
      ["t-barakah", idB, "disabled"],
      ["t-amanah", idA, "pin_observed"],
    ])
    expect(plan.disableIds).toEqual([idC])
    expect(plan.reviveIds).toEqual([])
  })

  test("adopts one legacy tile labelled with the signed-in cooperative", () => {
    const owner = { cooperativeName: "Amanah", mark: "AM", tenantId: "t-amanah" }
    const plan = reconcile({
      owner,
      pinned: [{ enabled: false, id: idA, label: "Amanah" }],
    })
    expect(plan.reviveIds).toEqual([idA])
    expect(plan.registry.associations[0]).toMatchObject({
      label: "Amanah",
      shortcutId: idA,
      status: "pin_observed",
      tenantId: "t-amanah",
    })
    expect(plan.disableIds).toEqual([])
  })

  test("never adopts a legacy tile by guesswork", () => {
    const owner = { cooperativeName: "Amanah", mark: "AM", tenantId: "t-amanah" }
    const twoMatches = reconcile({
      owner,
      pinned: [
        { enabled: false, id: idA, label: "Amanah" },
        { enabled: false, id: idB, label: "Amanah" },
      ],
    })
    expect(twoMatches.registry.associations).toEqual([])
    expect(twoMatches.reviveIds).toEqual([])
    // Signed out, nothing is adopted.
    expect(
      reconcile({ pinned: [{ enabled: false, id: idA, label: "Amanah" }] })
        .registry.associations
    ).toEqual([])
  })

  test("fails closed on enabled pins nothing accounts for", () => {
    const plan = reconcile({
      pinned: [
        { enabled: true, id: idA, label: "Unknown" },
        { enabled: false, id: idB, label: "Unknown" },
      ],
      registry: queueShortcutCleanup(emptyShortcutRegistry(), [idC]),
    })
    expect(plan.disableIds.sort()).toEqual([idA, idC].sort())
  })
})
