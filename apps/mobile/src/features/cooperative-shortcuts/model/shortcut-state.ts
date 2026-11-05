import { parseShortcutId } from "./shortcut-intent"

/**
 * Pin state is separate from authentication state. `pin_observed` means the
 * launcher reported approval or listed the pin; it does not prove a tile is
 * still on a particular home-screen page.
 */
export type ShortcutLifecycle =
  | "unavailable"
  | "not_offered"
  | "deferred"
  | "request_prepared"
  | "request_sent"
  | "pin_observed"
  | "disabled"
  | "cleanup_pending"

export type ShortcutAssociationStatus = Extract<
  ShortcutLifecycle,
  "deferred" | "request_prepared" | "request_sent" | "pin_observed" | "disabled"
>

export type ShortcutAssociation = {
  label: string
  mark: string
  membershipId: string
  shortcutId: string | null
  status: ShortcutAssociationStatus
  tenantId: string
  updatedAt: number
  userId: string
  variant: string
}

/** Opaque cleanup id kept after the account mapping has been erased. */
export type ShortcutTombstone = {
  shortcutId: string
  status: "cleanup_pending"
}

export type ShortcutRegistry = {
  associations: ShortcutAssociation[]
  tombstones: ShortcutTombstone[]
  version: 1
}

export type ShortcutOwner = {
  activeMembershipId: string
  tenantId: string
  userId: string
}

export type PinnedShortcut = { enabled: boolean; id: string }

export const MAX_SHORTCUT_ASSOCIATIONS = 8
const MAX_TOMBSTONES = 32
const ASSOCIATION_STATUSES = new Set<string>([
  "deferred",
  "request_prepared",
  "request_sent",
  "pin_observed",
  "disabled",
])

export function emptyShortcutRegistry(): ShortcutRegistry {
  return { associations: [], tombstones: [], version: 1 }
}

function isBoundedString(value: unknown, max = 128): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max
}

function parseAssociation(value: unknown): ShortcutAssociation | null {
  if (!value || typeof value !== "object") return null
  const item = value as Record<string, unknown>
  const shortcutId =
    item.shortcutId === null ? null : parseShortcutId(item.shortcutId)
  if (item.shortcutId !== null && !shortcutId) return null
  if (
    !isBoundedString(item.userId) ||
    !isBoundedString(item.tenantId) ||
    !isBoundedString(item.membershipId) ||
    !isBoundedString(item.variant, 32) ||
    !isBoundedString(item.label, 160) ||
    !isBoundedString(item.mark, 8) ||
    typeof item.status !== "string" ||
    !ASSOCIATION_STATUSES.has(item.status) ||
    typeof item.updatedAt !== "number"
  ) {
    return null
  }
  if (item.status !== "deferred" && !shortcutId) return null
  return {
    label: item.label,
    mark: item.mark,
    membershipId: item.membershipId,
    shortcutId,
    status: item.status as ShortcutAssociationStatus,
    tenantId: item.tenantId,
    updatedAt: item.updatedAt,
    userId: item.userId,
    variant: item.variant,
  }
}

/**
 * Strict parse of the persisted registry. Unreadable entries are dropped, so
 * their pinned ids become unknown and the reconciler disables them.
 */
export function parseShortcutRegistry(raw: string | null): ShortcutRegistry {
  if (!raw) return emptyShortcutRegistry()
  try {
    const value = JSON.parse(raw) as Partial<ShortcutRegistry>
    if (value?.version !== 1) return emptyShortcutRegistry()
    return {
      associations: (Array.isArray(value.associations)
        ? value.associations
        : []
      )
        .map(parseAssociation)
        .filter((item): item is ShortcutAssociation => item !== null)
        .slice(0, MAX_SHORTCUT_ASSOCIATIONS),
      tombstones: (Array.isArray(value.tombstones) ? value.tombstones : [])
        .map((item) => parseShortcutId(item?.shortcutId))
        .filter((id): id is string => id !== null)
        .slice(0, MAX_TOMBSTONES)
        .map((shortcutId) => ({
          shortcutId,
          status: "cleanup_pending" as const,
        })),
      version: 1,
    }
  } catch {
    return emptyShortcutRegistry()
  }
}

export function findShortcutAssociation(
  registry: ShortcutRegistry,
  key: { tenantId: string; userId: string; variant: string }
) {
  return (
    registry.associations.find(
      (item) =>
        item.userId === key.userId &&
        item.tenantId === key.tenantId &&
        item.variant === key.variant
    ) ?? null
  )
}

export function findShortcutById(
  registry: ShortcutRegistry,
  shortcutId: string
) {
  return (
    registry.associations.find((item) => item.shortcutId === shortcutId) ?? null
  )
}

/** One association per account/cooperative/variant; role changes reuse it. */
export function upsertShortcutAssociation(
  registry: ShortcutRegistry,
  association: ShortcutAssociation
): ShortcutRegistry {
  const others = registry.associations.filter(
    (item) =>
      !(
        item.userId === association.userId &&
        item.tenantId === association.tenantId &&
        item.variant === association.variant
      )
  )
  const associations = [association, ...others]
  while (associations.length > MAX_SHORTCUT_ASSOCIATIONS) {
    // Drop the oldest unpinned deferral first; never the new association.
    let dropIndex = associations.length - 1
    for (let index = associations.length - 1; index > 0; index -= 1) {
      const item = associations[index]
      if (item?.status === "deferred" && item.shortcutId === null) {
        dropIndex = index
        break
      }
    }
    associations.splice(dropIndex, 1)
  }
  return { ...registry, associations }
}

export function setShortcutStatus(
  registry: ShortcutRegistry,
  shortcutId: string,
  status: ShortcutAssociationStatus,
  now: number
): ShortcutRegistry {
  return {
    ...registry,
    associations: registry.associations.map((item) =>
      item.shortcutId === shortcutId
        ? { ...item, status, updatedAt: now }
        : item
    ),
  }
}

function withTombstones(registry: ShortcutRegistry, ids: string[]) {
  const known = new Set(registry.tombstones.map((item) => item.shortcutId))
  const added = ids
    .filter((id) => !known.has(id))
    .map((shortcutId) => ({ shortcutId, status: "cleanup_pending" as const }))
  return [...registry.tombstones, ...added].slice(-MAX_TOMBSTONES)
}

/**
 * First, durable step of sign-out cleanup: erase every account/cooperative
 * mapping and keep only opaque ids that still need a native disable.
 */
export function beginShortcutSignOutCleanup(registry: ShortcutRegistry) {
  const ids = registry.associations
    .map((item) => item.shortcutId)
    .filter((id): id is string => id !== null)
  const next: ShortcutRegistry = {
    associations: [],
    tombstones: withTombstones(registry, ids),
    version: 1,
  }
  return {
    disableIds: next.tombstones.map((item) => item.shortcutId),
    registry: next,
  }
}

export function completeShortcutCleanup(
  registry: ShortcutRegistry,
  disabledIds: readonly string[]
): ShortcutRegistry {
  const done = new Set(disabledIds)
  return {
    ...registry,
    tombstones: registry.tombstones.filter(
      (item) => !done.has(item.shortcutId)
    ),
  }
}

/**
 * Reconciles launcher state against the signed owner before anything is
 * enabled: pins not owned by the current account on this variant are
 * disabled; owned pins observed by the launcher advance to `pin_observed`.
 */
export function planShortcutReconcile(input: {
  now: number
  observedIds: readonly string[]
  owner: ShortcutOwner | null
  pinned: readonly PinnedShortcut[] | null
  registry: ShortcutRegistry
  variant: string
}) {
  if (!input.owner) {
    const cleanup = beginShortcutSignOutCleanup(input.registry)
    const enabledPins = (input.pinned ?? [])
      .filter((item) => item.enabled)
      .map((item) => item.id)
    return {
      disableIds: [...new Set([...cleanup.disableIds, ...enabledPins])],
      registry: cleanup.registry,
    }
  }

  const owner = input.owner
  const owned: ShortcutAssociation[] = []
  const foreignIds: string[] = []
  for (const item of input.registry.associations) {
    if (item.userId === owner.userId && item.variant === input.variant) {
      owned.push(item)
    } else if (item.shortcutId) {
      foreignIds.push(item.shortcutId)
    }
  }

  const pinnedById = input.pinned
    ? new Map(input.pinned.map((item) => [item.id, item]))
    : null
  const observed = new Set(input.observedIds)
  const associations = owned.map((item) => {
    let next = item
    if (
      item.tenantId === owner.tenantId &&
      item.membershipId !== owner.activeMembershipId
    ) {
      next = {
        ...next,
        membershipId: owner.activeMembershipId,
        updatedAt: input.now,
      }
    }
    if (!item.shortcutId || item.status === "disabled") return next
    const pin = pinnedById?.get(item.shortcutId)
    if (observed.has(item.shortcutId) || pin?.enabled) {
      return item.status === "pin_observed"
        ? next
        : { ...next, status: "pin_observed" as const, updatedAt: input.now }
    }
    if (pinnedById && !pin && item.status === "pin_observed") {
      // The user removed the tile; offer retry, never recreate it unasked.
      return { ...next, status: "deferred" as const, updatedAt: input.now }
    }
    return next
  })

  const activeOwnedIds = new Set(
    associations
      .filter((item) => item.shortcutId && item.status !== "disabled")
      .map((item) => item.shortcutId as string)
  )
  const unknownPins = (input.pinned ?? [])
    .filter((item) => item.enabled && !activeOwnedIds.has(item.id))
    .map((item) => item.id)
  const registry: ShortcutRegistry = {
    associations,
    tombstones: withTombstones(input.registry, foreignIds),
    version: 1,
  }
  return {
    disableIds: [
      ...new Set([
        ...registry.tombstones.map((item) => item.shortcutId),
        ...unknownPins,
      ]),
    ],
    registry,
  }
}
