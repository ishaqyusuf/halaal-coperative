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
  beginShortcutSignOutCleanup,
  completeShortcutCleanup,
  findShortcutAssociation,
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
  membershipId: string
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
  "consumeObservedPins" | "disable" | "listPinned" | "requestPin" | "update"
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
  signOutBudgetMs: number
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
    context: Pick<ShortcutContext, "cooperativeName" | "mark">
  ): NativeShortcutSpec {
    const labels = buildShortcutLabels(context.cooperativeName)
    return {
      environment: deps.identity.environment,
      id: shortcutId,
      longLabel: labels.longLabel,
      mark: sanitizeShortcutMark(context.mark),
      shortLabel: labels.shortLabel,
      uri: buildShortcutUri(deps.identity.scheme ?? "", shortcutId),
    }
  }

  function key(context: Pick<ShortcutContext, "tenantId" | "userId">) {
    return { ...context, variant: deps.identity.variant }
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

  async function disableAssociation(
    context: Pick<ShortcutContext, "tenantId" | "userId">
  ) {
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

  async function runSignOutCleanup() {
    let disableIds: string[] = []
    await deps.updateRegistry((current) => {
      const cleanup = beginShortcutSignOutCleanup(current)
      disableIds = cleanup.disableIds
      return cleanup.registry
    })
    // Without the native module no launcher shortcut can exist to disable.
    if (await disableNative(disableIds)) {
      await deps.updateRegistry((current) =>
        completeShortcutCleanup(current, disableIds)
      )
    }
  }

  return {
    pending,

    defer(context: ShortcutContext) {
      return deps.updateRegistry((current) =>
        findShortcutAssociation(current, key(context))
          ? current
          : upsertShortcutAssociation(current, {
              label: context.cooperativeName,
              mark: sanitizeShortcutMark(context.mark),
              membershipId: context.membershipId,
              shortcutId: null,
              status: "deferred",
              tenantId: context.tenantId,
              updatedAt: deps.now(),
              userId: context.userId,
              variant: deps.identity.variant,
            })
      )
    },

    disable: disableAssociation,

    /** A target membership was removed: disable only that association. */
    disableForTenant: disableAssociation,

    read: deps.readRegistry,

    async reconcile(owner: ShortcutOwner | null) {
      if (!deps.native) return deps.readRegistry()
      const [pinned, observedIds] = await Promise.all([
        deps.native.listPinned().catch(() => null),
        deps.native.consumeObservedPins().catch(() => [] as string[]),
      ])
      let disableIds: string[] = []
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
        return plan.registry
      })
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
            membershipId: context.membershipId,
            shortcutId:
              existing?.shortcutId ?? createShortcutId(deps.randomBytes),
            status: "request_prepared",
            tenantId: context.tenantId,
            updatedAt: deps.now(),
            userId: context.userId,
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
              : "deferred"
        const registry = await deps.updateRegistry((current) =>
          setShortcutStatus(current, shortcutId, status, deps.now())
        )
        return { outcome, registry }
      } finally {
        requestInFlight = false
      }
    },

    /**
     * Best-effort launcher cleanup for every sign-out and session
     * invalidation. It is bounded and never throws, so it can never keep an
     * authenticated session or UI alive.
     */
    async signOutCleanup() {
      pending.clear()
      const work = runSignOutCleanup().catch(deps.reportError)
      await Promise.race([
        work,
        new Promise<void>((resolve) =>
          setTimeout(resolve, deps.signOutBudgetMs)
        ),
      ])
    },
  }
}

export type CooperativeShortcutService = ReturnType<
  typeof createCooperativeShortcutService
>
