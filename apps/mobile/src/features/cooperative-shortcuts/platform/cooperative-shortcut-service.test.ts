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
  tenantId: "t-amanah",
  userId: "user-a",
}
const shortcutId = `cs1-${"ab".repeat(16)}`

function harness(
  overrides: {
    disable?: (ids: string[]) => Promise<number>
    native?: boolean
    pinned?: PinnedShortcut[]
    requestPin?: (spec: NativeShortcutSpec) => Promise<NativePinResult>
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
            enable: async (id) => {
              events.push(`native-enable:${id}`)
              return true
            },
            listPinned: async () => overrides.pinned ?? [],
            requestPin: async (spec) => {
              specs.push(spec)
              events.push(`native-request:${stored.associations[0]?.status}`)
              return overrides.requestPin
                ? overrides.requestPin(spec)
                : "requested"
            },
            update: async (spec) => {
              specs.push(spec)
              events.push(`native-update:${spec.id}`)
              return true
            },
          },
    now: () => 10,
    randomBytes: (count) => new Uint8Array(count).fill(171),
    readRegistry: () => stored,
    reportError: (error) => void errors.push(error),
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
      id: shortcutId,
      longLabel: "Amanah Savings",
      mark: "AS",
      shortLabel: "Amanah…",
      tenantId: "t-amanah",
      uri: `halaalvest-preview://cooperative-shortcut/${shortcutId}`,
    })
  })

  test("launcher metadata carries the cooperative but no account or session data", async () => {
    const { service, specs } = harness()
    await service.request(context)
    const metadata = JSON.stringify(specs)
    for (const secret of ["user-a", "token"]) {
      expect(metadata).not.toContain(secret)
    }
    expect(specs[0]?.uri).not.toContain("t-amanah")
  })

  test("reuses one id per cooperative across retries and accounts", async () => {
    const { service, specs, stored } = harness({
      requestPin: async () => "rejected",
    })
    await service.request(context)
    await service.request({ ...context, userId: "user-b" })

    expect(specs[0]?.id).toBe(specs[1]?.id)
    expect(stored().associations).toHaveLength(1)
    expect(stored().associations[0]?.status).toBe("removed")
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
    expect(stored().associations[0]?.status).toBe("removed")
    expect(errors).toHaveLength(1)
  })

  test("is unsupported without the native module", async () => {
    const { service, stored } = harness({ native: false })
    expect((await service.request(context)).outcome).toBe("unsupported")
    expect(stored().associations).toEqual([])
  })

  test("\"Not now\" is remembered for that account only", async () => {
    const { service, stored } = harness()
    await service.defer(context)
    await service.defer(context)
    expect(stored().deferrals).toEqual([
      { tenantId: "t-amanah", updatedAt: 10, userId: "user-a", variant: "preview" },
    ])
    expect(stored().associations).toEqual([])
  })

  test("reconcile leaves a signed-out cooperative shortcut on", async () => {
    const { events, service } = harness({
      pinned: [{ enabled: true, id: shortcutId }],
    })
    await service.request(context)
    events.length = 0
    await service.reconcile(null)
    expect(events.filter((event) => event.startsWith("native"))).toEqual([])
  })

  test("reconcile revives an adopted legacy tile and stamps its cooperative", async () => {
    const legacy = `cs1-${"ef".repeat(16)}`
    const { events, service, specs, stored } = harness({
      pinned: [{ enabled: false, id: legacy, label: "Amanah…" }],
    })
    await service.reconcile({
      cooperativeName: "Amanah Savings",
      mark: "AS",
      tenantId: "t-amanah",
    })
    expect(events.filter((event) => event.startsWith("native"))).toEqual([
      `native-enable:${legacy}`,
      `native-update:${legacy}`,
    ])
    expect(specs[0]?.tenantId).toBe("t-amanah")
    expect(stored().associations[0]).toMatchObject({
      shortcutId: legacy,
      status: "pin_observed",
      tenantId: "t-amanah",
    })
  })

  test("reconcile disables an enabled pin nothing accounts for", async () => {
    const { events, service } = harness({
      pinned: [{ enabled: true, id: `cs1-${"cd".repeat(16)}` }],
    })
    await service.reconcile(null)
    expect(events).toContain(`native-disable:cs1-${"cd".repeat(16)}`)
  })

  test("disabling one cooperative leaves the other shortcuts alone", async () => {
    const { events, service, stored } = harness()
    await service.request(context)
    await service.disable({ tenantId: "t-amanah" })
    expect(stored().associations[0]?.status).toBe("disabled")
    expect(events.at(-1)).toBe(`native-disable:${shortcutId}`)
    events.length = 0
    await service.disable({ tenantId: "t-other" })
    expect(events.filter((event) => event.startsWith("native"))).toEqual([])
  })
})
