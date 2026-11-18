import { buildShortcutUri, createShortcutId } from "../model/shortcut-intent"
import {
  buildShortcutLabels,
  sanitizeShortcutMark,
} from "../model/shortcut-label"
import {
  createPendingShortcutStore,
  SHORTCUT_DISABLED_MESSAGE,
} from "../model/shortcut-policy"
import {
  addShortcutDeferral,
  completeShortcutCleanup,
  findShortcutAssociation,
  findShortcutById,
  planShortcutReconcile,
  setShortcutStatus,
  upsertShortcutAssociation,
  type ShortcutAssociation,
  type ShortcutOwner,
  type ShortcutRegistry,
} from "../model/shortcut-state"
import type {
  cooperativeShortcutNative,
  NativeShortcutSpec,
  ShortcutEnvironment,
} from "./cooperative-shortcut-platform"

export type ShortcutContext = {
  cooperativeName: string
  mark: string
  tenantId: string
  userId: string
}

export type ShortcutRequestOutcome =
  | "requested"
  | "already_pinned"
  | "rejected"
  | "unsupported"
  | "busy"
  | "failed"

type ShortcutServiceNative = Pick<
  NonNullable<typeof cooperativeShortcutNative>,
  | "consumeObservedPins"
  | "disable"
  | "enable"
  | "listPinned"
  | "requestPin"
  | "update"
>

export type CooperativeShortcutServiceDeps = {
  identity: {
    environment: ShortcutEnvironment
    scheme: string | null
    variant: string
  }
  native: ShortcutServiceNative | null
  now: () => number
  randomBytes: (count: number) => Uint8Array
  readRegistry: () => ShortcutRegistry
  reportError: (error: unknown) => void
  updateRegistry: (
    update: (registry: ShortcutRegistry) => ShortcutRegistry
  ) => Promise<ShortcutRegistry>
}

export function createCooperativeShortcutService(
  deps: CooperativeShortcutServiceDeps
) {
  const pending = createPendingShortcutStore(deps.now)
  let requestInFlight = false

  function spec(
    shortcutId: string,
    context: Pick<ShortcutContext, "cooperativeName" | "mark" | "tenantId">
  ): NativeShortcutSpec {
    const labels = buildShortcutLabels(context.cooperativeName)
    return {
      environment: deps.identity.environment,
      id: shortcutId,
      longLabel: labels.longLabel,
      mark: sanitizeShortcutMark(context.mark),
      shortLabel: labels.shortLabel,
      tenantId: context.tenantId,
      uri: buildShortcutUri(deps.identity.scheme ?? "", shortcutId),
    }
  }

  function key(context: Pick<ShortcutContext, "tenantId">) {
    return { tenantId: context.tenantId, variant: deps.identity.variant }
  }

  async function disableNative(ids: string[]) {
    if (!deps.native || ids.length === 0) return true
    try {
      await deps.native.disable(ids, SHORTCUT_DISABLED_MESSAGE)
      return true
    } catch (error) {
      deps.reportError(error)
      return false
    }
  }

  async function disableAssociation(context: Pick<ShortcutContext, "tenantId">) {
    // Persist the disabled state before the native call can be interrupted.
    const registry = await deps.updateRegistry((current) => {
      const shortcutId = findShortcutAssociation(
        current,
        key(context)
      )?.shortcutId
      return shortcutId
        ? setShortcutStatus(current, shortcutId, "disabled", deps.now())
        : current
    })
    const shortcutId = findShortcutAssociation(
      registry,
      key(context)
    )?.shortcutId
    if (shortcutId) await disableNative([shortcutId])
    return registry
  }

  /**
   * Turns a disabled tile the registry still counts as live back on, and
   * refreshes its label, icon and cooperative extras.
   */
  async function reviveNative(registry: ShortcutRegistry, ids: string[]) {
    if (!deps.native) return
    for (const id of ids) {
      const association = findShortcutById(registry, id)
      if (!association) continue
      try {
        await deps.native.enable(id)
        await deps.native.update(
          spec(id, {
            cooperativeName: association.label,
            mark: association.mark,
            tenantId: association.tenantId,
          })
        )
      } catch (error) {
        deps.reportError(error)
      }
    }
  }

  return {
    pending,

    /** "Not now" on the offer, remembered for this account only. */
    defer(context: ShortcutContext) {
      return deps.updateRegistry((current) =>
        addShortcutDeferral(current, {
          tenantId: context.tenantId,
          updatedAt: deps.now(),
          userId: context.userId,
          variant: deps.identity.variant,
        })
      )
    },

    disable: disableAssociation,

    read: deps.readRegistry,

    async reconcile(owner: ShortcutOwner | null) {
      if (!deps.native) return deps.readRegistry()
      const [pinned, observedIds] = await Promise.all([
        deps.native.listPinned().catch(() => null),
        deps.native.consumeObservedPins().catch(() => [] as string[]),
      ])
      let disableIds: string[] = []
      let reviveIds: string[] = []
      const registry = await deps.updateRegistry((current) => {
        const plan = planShortcutReconcile({
          now: deps.now(),
          observedIds,
          owner,
          pinned,
          registry: current,
          variant: deps.identity.variant,
        })
        disableIds = plan.disableIds
        reviveIds = plan.reviveIds
        return plan.registry
      })
      await reviveNative(registry, reviveIds)
      if (disableIds.length > 0 && (await disableNative(disableIds))) {
        return deps.updateRegistry((current) =>
          completeShortcutCleanup(current, disableIds)
        )
      }
      return registry
    },

    async refresh(context: ShortcutContext) {
      const association = findShortcutAssociation(
        deps.readRegistry(),
        key(context)
      )
      if (!deps.native || !association?.shortcutId) return false
      if (association.status !== "pin_observed") return false
      try {
        const updated = await deps.native.update(
          spec(association.shortcutId, context)
        )
        await deps.updateRegistry((current) =>
          upsertShortcutAssociation(current, {
            ...association,
            label: context.cooperativeName,
            mark: sanitizeShortcutMark(context.mark),
            updatedAt: deps.now(),
          })
        )
        return updated
      } catch (error) {
        deps.reportError(error)
        return false
      }
    },

    /**
     * Persists a `request_prepared` association before asking Android, so a
     * crash or late approval can always be reconciled to a known owner.
     */
    async request(context: ShortcutContext): Promise<{
      outcome: ShortcutRequestOutcome
      registry: ShortcutRegistry
    }> {
      if (!deps.native || !deps.identity.scheme) {
        return { outcome: "unsupported", registry: deps.readRegistry() }
      }
      if (requestInFlight) {
        return { outcome: "busy", registry: deps.readRegistry() }
      }
      requestInFlight = true
      try {
        const preparedRegistry = await deps.updateRegistry((current) => {
          const existing = findShortcutAssociation(current, key(context))
          const prepared: ShortcutAssociation = {
            label: context.cooperativeName,
            mark: sanitizeShortcutMark(context.mark),
            shortcutId:
              existing?.shortcutId ?? createShortcutId(deps.randomBytes),
            status: "request_prepared",
            tenantId: context.tenantId,
            updatedAt: deps.now(),
            variant: deps.identity.variant,
          }
          return upsertShortcutAssociation(current, prepared)
        })
        const shortcutId = findShortcutAssociation(
          preparedRegistry,
          key(context)
        )?.shortcutId
        if (!shortcutId) throw new Error("Shortcut association was not saved.")

        let outcome: ShortcutRequestOutcome
        try {
          outcome = await deps.native.requestPin(spec(shortcutId, context))
        } catch (error) {
          deps.reportError(error)
          outcome = "failed"
        }
        const status =
          outcome === "requested"
            ? "request_sent"
            : outcome === "already_pinned"
              ? "pin_observed"
              : "removed"
        const registry = await deps.updateRegistry((current) =>
          setShortcutStatus(current, shortcutId, status, deps.now())
        )
        return { outcome, registry }
      } finally {
        requestInFlight = false
      }
    },
  }
}

export type CooperativeShortcutService = ReturnType<
  typeof createCooperativeShortcutService
>
