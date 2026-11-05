import { describe, expect, test } from "bun:test"

import {
  emptyShortcutRegistry,
  type PinnedShortcut,
  type ShortcutRegistry,
} from "../model/shortcut-state"
import type {
  NativePinResult,
  NativeShortcutSpec,
} from "./cooperative-shortcut-platform"
import {
  createCooperativeShortcutService,
  type CooperativeShortcutServiceDeps,
} from "./cooperative-shortcut-service"

const context = {
  cooperativeName: "Amanah Savings",
  mark: "AS",
  membershipId: "m-amanah",
  tenantId: "t-amanah",
  userId: "user-a",
}

function harness(
  overrides: {
    disable?: (ids: string[]) => Promise<number>
    native?: boolean
    pinned?: PinnedShortcut[]
    requestPin?: (spec: NativeShortcutSpec) => Promise<NativePinResult>
    signOutBudgetMs?: number
    updateFails?: boolean
  } = {}
) {
  let stored: ShortcutRegistry = emptyShortcutRegistry()
  const events: string[] = []
  const specs: NativeShortcutSpec[] = []
  const errors: unknown[] = []
  const deps: CooperativeShortcutServiceDeps = {
    identity: {
      environment: "preview",
      scheme: "halaalvest-preview",
      variant: "preview",
    },
    native:
      overrides.native === false
        ? null
        : {
            consumeObservedPins: async () => [],
            disable: async (ids) => {
              events.push(`native-disable:${ids.join(",")}`)
              return overrides.disable ? overrides.disable(ids) : ids.length
            },
            listPinned: async () => overrides.pinned ?? [],
            requestPin: async (spec) => {
              specs.push(spec)
              events.push(`native-request:${stored.associations[0]?.status}`)
              return overrides.requestPin
                ? overrides.requestPin(spec)
                : "requested"
            },
            update: async () => true,
          },
    now: () => 10,
    randomBytes: (count) => new Uint8Array(count).fill(171),
    readRegistry: () => stored,
    reportError: (error) => void errors.push(error),
    signOutBudgetMs: overrides.signOutBudgetMs ?? 1000,
    updateRegistry: async (update) => {
      if (overrides.updateFails) throw new Error("secure storage unavailable")
      stored = update(stored)
      events.push(
        `persist:${stored.associations.length}/${stored.tombstones.length}`
      )
      return stored
    },
  }
  return {
    errors,
    events,
    service: createCooperativeShortcutService(deps),
    specs,
    stored: () => stored,
  }
}

describe("cooperative shortcut service", () => {
  test("persists the association before Android sees the pin request", async () => {
    const { events, service, specs, stored } = harness()
    const result = await service.request(context)

    expect(result.outcome).toBe("requested")
    expect(events[0]).toBe("persist:1/0")
    expect(events[1]).toBe("native-request:request_prepared")
    expect(stored().associations[0]?.status).toBe("request_sent")
    expect(specs[0]).toEqual({
      environment: "preview",
      id: `cs1-${"ab".repeat(16)}`,
      longLabel: "Amanah Savings",
      mark: "AS",
      shortLabel: "Amanah…",
      uri: `halaalvest-preview://cooperative-shortcut/cs1-${"ab".repeat(16)}`,
    })
  })

  test("launcher metadata never carries session or personal data", async () => {
    const { service, specs } = harness()
    await service.request(context)
    const metadata = JSON.stringify(specs)
    for (const secret of ["user-a", "m-amanah", "t-amanah", "token"]) {
      expect(metadata).not.toContain(secret)
    }
  })

  test("reuses one id per account and cooperative across retries", async () => {
    const { service, specs, stored } = harness({
      requestPin: async () => "rejected",
    })
    await service.request(context)
    await service.request({ ...context, membershipId: "m-amanah-admin" })

    expect(specs[0]?.id).toBe(specs[1]?.id)
    expect(stored().associations).toHaveLength(1)
    expect(stored().associations[0]?.status).toBe("deferred")
  })

  test("prevents concurrent pin requests", async () => {
    let release: (value: NativePinResult) => void = () => undefined
    const { service } = harness({
      requestPin: () => new Promise((resolve) => (release = resolve)),
    })
    const first = service.request(context)
    await Bun.sleep(0)
    expect((await service.request(context)).outcome).toBe("busy")
    release("requested")
    expect((await first).outcome).toBe("requested")
  })

  test("a native failure leaves a retryable state instead of a false success", async () => {
    const { errors, service, stored } = harness({
      requestPin: async () => {
        throw new Error("launcher crashed")
      },
    })
    expect((await service.request(context)).outcome).toBe("failed")
    expect(stored().associations[0]?.status).toBe("deferred")
    expect(errors).toHaveLength(1)
  })

  test("is unsupported without the native module", async () => {
    const { service, stored } = harness({ native: false })
    expect((await service.request(context)).outcome).toBe("unsupported")
    expect(stored().associations).toEqual([])
  })

  test("sign-out erases mappings first, then disables, then clears tombstones", async () => {
    const { events, service, stored } = harness()
    await service.request(context)
    service.pending.set(`cs1-${"ab".repeat(16)}`)
    events.length = 0

    await service.signOutCleanup()

    expect(events).toEqual([
      "persist:0/1",
      `native-disable:cs1-${"ab".repeat(16)}`,
      "persist:0/0",
    ])
    expect(stored()).toEqual(emptyShortcutRegistry())
    expect(service.pending.peek()).toBeNull()
  })

  test("sign-out cleanup never throws and keeps the tombstone after a native failure", async () => {
    const { errors, service, stored } = harness({
      disable: async () => {
        throw new Error("shortcut service unavailable")
      },
    })
    await service.request(context)
    await expect(service.signOutCleanup()).resolves.toBeUndefined()
    expect(stored().associations).toEqual([])
    expect(stored().tombstones).toHaveLength(1)
    expect(errors).toHaveLength(1)
  })

  test("sign-out cleanup is bounded when the launcher hangs", async () => {
    const { service } = harness({
      disable: () => new Promise(() => undefined),
      signOutBudgetMs: 20,
    })
    await service.request(context)
    const started = Date.now()
    await service.signOutCleanup()
    expect(Date.now() - started).toBeLessThan(500)
  })

  test("sign-out cleanup survives a storage failure", async () => {
    const { errors, service } = harness({ updateFails: true })
    await expect(service.signOutCleanup()).resolves.toBeUndefined()
    expect(errors).toHaveLength(1)
  })

  test("reconcile disables a late approval delivered after sign-out", async () => {
    const { events, service } = harness({
      pinned: [{ enabled: true, id: `cs1-${"cd".repeat(16)}` }],
    })
    await service.reconcile(null)
    expect(events).toContain(`native-disable:cs1-${"cd".repeat(16)}`)
  })

  test("disabling one cooperative leaves the account's other shortcuts alone", async () => {
    const { events, service, stored } = harness()
    await service.request(context)
    await service.disableForTenant({ tenantId: "t-amanah", userId: "user-a" })
    expect(stored().associations[0]?.status).toBe("disabled")
    expect(events.at(-1)).toBe(`native-disable:cs1-${"ab".repeat(16)}`)
    events.length = 0
    await service.disableForTenant({ tenantId: "t-other", userId: "user-a" })
    expect(events.filter((event) => event.startsWith("native"))).toEqual([])
  })
})
