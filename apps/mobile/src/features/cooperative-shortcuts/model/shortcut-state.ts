import { buildShortcutLabels, sanitizeShortcutMark } from "./shortcut-label"
import { parseShortcutId } from "./shortcut-intent"

/**
 * A launcher shortcut belongs to this phone and a cooperative, not to the
 * account that added it. It survives sign-out, so another account of the
 * same cooperative is not asked to add it again, and tapping it while signed
 * out opens that cooperative's sign-in. `pin_observed` means the launcher
 * reported approval or listed the pin; it does not prove a tile is still on a
 * particular home-screen page.
 */
export type ShortcutAssociationStatus =
  | "request_prepared"
  | "request_sent"
  | "pin_observed"
  | "removed"
  | "disabled"

export type ShortcutAssociation = {
  label: string
  mark: string
  shortcutId: string
  status: ShortcutAssociationStatus
  tenantId: string
  updatedAt: number
  variant: string
}

/** "Not now" on the add offer: per account, so one person's no is theirs. */
export type ShortcutDeferral = {
  tenantId: string
  updatedAt: number
  userId: string
  variant: string
}

/** Opaque id that still needs a native disable. */
export type ShortcutTombstone = {
  shortcutId: string
  status: "cleanup_pending"
}

export type ShortcutRegistry = {
  associations: ShortcutAssociation[]
  deferrals: ShortcutDeferral[]
  tombstones: ShortcutTombstone[]
  version: 2
}

/** The cooperative the current session is signed in to, if any. */
export type ShortcutOwner = {
  cooperativeName: string
  mark: string
  tenantId: string
}

/**
 * A pinned launcher shortcut. Shortcuts added since registry v2 carry their
 * cooperative in the launcher's extras; older tiles only have a label.
 */
export type PinnedShortcut = {
  enabled: boolean
  id: string
  label?: string | null
  mark?: string | null
  tenantId?: string | null
}

export const MAX_SHORTCUT_ASSOCIATIONS = 8
const MAX_DEFERRALS = 16
const MAX_TOMBSTONES = 32
const ASSOCIATION_STATUSES = new Set<string>([
  "request_prepared",
  "request_sent",
  "pin_observed",
  "removed",
  "disabled",
])

export function emptyShortcutRegistry(): ShortcutRegistry {
  return { associations: [], deferrals: [], tombstones: [], version: 2 }
}

function isBoundedString(value: unknown, max = 128): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max
}

function parseAssociation(value: unknown): ShortcutAssociation | null {
  if (!value || typeof value !== "object") return null
  const item = value as Record<string, unknown>
  const shortcutId = parseShortcutId(item.shortcutId)
  if (
    !shortcutId ||
    !isBoundedString(item.tenantId) ||
    !isBoundedString(item.variant, 32) ||
    !isBoundedString(item.label, 160) ||
    !isBoundedString(item.mark, 8) ||
    typeof item.status !== "string" ||
    !ASSOCIATION_STATUSES.has(item.status) ||
    typeof item.updatedAt !== "number"
  ) {
    return null
  }
  return {
    label: item.label,
    mark: item.mark,
    shortcutId,
    status: item.status as ShortcutAssociationStatus,
    tenantId: item.tenantId,
    updatedAt: item.updatedAt,
    variant: item.variant,
  }
}

function parseDeferral(value: unknown): ShortcutDeferral | null {
  if (!value || typeof value !== "object") return null
  const item = value as Record<string, unknown>
  if (
    !isBoundedString(item.tenantId) ||
    !isBoundedString(item.userId) ||
    !isBoundedString(item.variant, 32) ||
    typeof item.updatedAt !== "number"
  ) {
    return null
  }
  return {
    tenantId: item.tenantId,
    updatedAt: item.updatedAt,
    userId: item.userId,
    variant: item.variant,
  }
}

function parseTombstones(value: unknown) {
  return (Array.isArray(value) ? value : [])
    .map((item) => parseShortcutId(item?.shortcutId))
    .filter((id): id is string => id !== null)
    .slice(-MAX_TOMBSTONES)
    .map((shortcutId) => ({ shortcutId, status: "cleanup_pending" as const }))
}

/**
 * Registry v1 keyed shortcuts by account. Its active shortcuts become
 * cooperative shortcuts; a second account's tile for the same cooperative is
 * queued for disable, since one cooperative now has one shortcut.
 */
function migrateV1(value: Record<string, unknown>): ShortcutRegistry {
  let registry: ShortcutRegistry = {
    ...emptyShortcutRegistry(),
    tombstones: parseTombstones(value.tombstones),
  }
  const items = (Array.isArray(value.associations) ? value.associations : [])
    .filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === "object")
    )
    // Pinned first, then newest, so the best tile wins its cooperative.
    .sort((a, b) => {
      const pinned =
        Number(b.status === "pin_observed") - Number(a.status === "pin_observed")
      return pinned || Number(b.updatedAt ?? 0) - Number(a.updatedAt ?? 0)
    })
  const losers: string[] = []
  for (const item of items) {
    if (item.status === "deferred" && item.shortcutId === null) {
      const deferral = parseDeferral(item)
      if (deferral) registry = addShortcutDeferral(registry, deferral)
      continue
    }
    const association = parseAssociation({
      ...item,
      status: item.status === "deferred" ? "removed" : item.status,
    })
    if (!association) continue
    if (findShortcutAssociation(registry, association)) {
      losers.push(association.shortcutId)
      continue
    }
    registry = upsertShortcutAssociation(registry, association)
  }
  return queueShortcutCleanup(registry, losers)
}

/**
 * Strict parse of the persisted registry. Unreadable entries are dropped, so
 * their pinned ids become unknown and the reconciler disables them.
 */
export function parseShortcutRegistry(raw: string | null): ShortcutRegistry {
  if (!raw) return emptyShortcutRegistry()
  try {
    const value = JSON.parse(raw) as Record<string, unknown> | null
    if (value?.version === 1) return migrateV1(value)
    if (value?.version !== 2) return emptyShortcutRegistry()
    return {
      associations: (Array.isArray(value.associations)
        ? value.associations
        : []
      )
        .map(parseAssociation)
        .filter((item): item is ShortcutAssociation => item !== null)
        .slice(0, MAX_SHORTCUT_ASSOCIATIONS),
      deferrals: (Array.isArray(value.deferrals) ? value.deferrals : [])
        .map(parseDeferral)
        .filter((item): item is ShortcutDeferral => item !== null)
        .slice(0, MAX_DEFERRALS),
      tombstones: parseTombstones(value.tombstones),
      version: 2,
    }
  } catch {
    return emptyShortcutRegistry()
  }
}

export function findShortcutAssociation(
  registry: ShortcutRegistry,
  key: { tenantId: string; variant: string }
) {
  return (
    registry.associations.find(
      (item) => item.tenantId === key.tenantId && item.variant === key.variant
    ) ?? null
  )
}

export function findShortcutById(
  registry: ShortcutRegistry,
  shortcutId: string
) {
  return (
    registry.associations.find((item) => item.shortcutId === shortcutId) ??
    null
  )
}

export function hasShortcutDeferral(
  registry: ShortcutRegistry,
  key: { tenantId: string; userId: string; variant: string }
) {
  return registry.deferrals.some(
    (item) =>
      item.tenantId === key.tenantId &&
      item.userId === key.userId &&
      item.variant === key.variant
  )
}

/** One shortcut per cooperative and variant; a re-add reuses its id. */
export function upsertShortcutAssociation(
  registry: ShortcutRegistry,
  association: ShortcutAssociation
): ShortcutRegistry {
  const others = registry.associations.filter(
    (item) =>
      !(
        item.tenantId === association.tenantId &&
        item.variant === association.variant
      )
  )
  const associations = [association, ...others]
  while (associations.length > MAX_SHORTCUT_ASSOCIATIONS) {
    // Drop the oldest shortcut that is no longer live; never the new one.
    let dropIndex = associations.length - 1
    for (let index = associations.length - 1; index > 0; index -= 1) {
      const status = associations[index]?.status
      if (status === "removed" || status === "disabled") {
        dropIndex = index
        break
      }
    }
    associations.splice(dropIndex, 1)
  }
  return { ...registry, associations }
}

export function addShortcutDeferral(
  registry: ShortcutRegistry,
  deferral: ShortcutDeferral
): ShortcutRegistry {
  if (hasShortcutDeferral(registry, deferral)) return registry
  return {
    ...registry,
    deferrals: [deferral, ...registry.deferrals].slice(0, MAX_DEFERRALS),
  }
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

/** Queues opaque ids for a native disable that may not finish this run. */
export function queueShortcutCleanup(
  registry: ShortcutRegistry,
  ids: readonly string[]
): ShortcutRegistry {
  const known = new Set(registry.tombstones.map((item) => item.shortcutId))
  const added = [...new Set(ids)]
    .filter((id) => !known.has(id))
    .map((shortcutId) => ({ shortcutId, status: "cleanup_pending" as const }))
  return {
    ...registry,
    tombstones: [...registry.tombstones, ...added].slice(-MAX_TOMBSTONES),
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
 * Reconciles the registry with the launcher. Signing in or out never
 * changes a shortcut. The plan:
 * - advances shortcuts the launcher approved or lists, and marks a tile the
 *   user removed as `removed` (offered again only when they ask);
 * - revives a tile the launcher shows disabled while the registry says it is
 *   live (for example one an older version disabled at sign-out);
 * - recovers pins that carry their cooperative after local storage was lost;
 * - adopts one legacy tile labelled with the signed-in cooperative's name;
 * - disables queued ids, user-disabled shortcuts that are still enabled, and
 *   enabled pins nothing accounts for (fail closed).
 */
export function planShortcutReconcile(input: {
  now: number
  observedIds: readonly string[]
  owner: ShortcutOwner | null
  pinned: readonly PinnedShortcut[] | null
  registry: ShortcutRegistry
  variant: string
}) {
  const pinnedById = input.pinned
    ? new Map(input.pinned.map((item) => [item.id, item]))
    : null
  const observed = new Set(input.observedIds)
  const reviveIds: string[] = []
  const disableIds = new Set(
    input.registry.tombstones.map((item) => item.shortcutId)
  )

  let registry: ShortcutRegistry = {
    ...input.registry,
    associations: input.registry.associations.map((item) => {
      if (item.variant !== input.variant) return item
      const pin = pinnedById?.get(item.shortcutId)
      if (item.status === "disabled") {
        if (pin?.enabled) disableIds.add(item.shortcutId)
        return item
      }
      if (observed.has(item.shortcutId) || pin?.enabled) {
        return item.status === "pin_observed"
          ? item
          : { ...item, status: "pin_observed" as const, updatedAt: input.now }
      }
      if (pin && !pin.enabled) {
        reviveIds.push(item.shortcutId)
        return { ...item, status: "pin_observed" as const, updatedAt: input.now }
      }
      if (pinnedById && !pin && item.status === "pin_observed") {
        // The user removed the tile; offer it again only when they ask.
        return { ...item, status: "removed" as const, updatedAt: input.now }
      }
      return item
    }),
  }

  const accounted = new Set([
    ...registry.associations.map((item) => item.shortcutId),
    ...disableIds,
  ])
  const unaccounted = (input.pinned ?? []).filter(
    (pin) => !accounted.has(pin.id)
  )

  for (const pin of unaccounted) {
    const tenantId = isBoundedString(pin.tenantId) ? pin.tenantId : null
    if (!tenantId) continue
    accounted.add(pin.id)
    if (findShortcutAssociation(registry, { tenantId, variant: input.variant })) {
      // The cooperative already has its shortcut; this is a stray copy.
      if (pin.enabled) disableIds.add(pin.id)
      continue
    }
    registry = upsertShortcutAssociation(registry, {
      label: isBoundedString(pin.label, 160) ? pin.label : "HalaalVest",
      mark: sanitizeShortcutMark(pin.mark),
      shortcutId: pin.id,
      status: pin.enabled ? "pin_observed" : "disabled",
      tenantId,
      updatedAt: input.now,
      variant: input.variant,
    })
  }

  const owner = input.owner
  if (
    owner &&
    !findShortcutAssociation(registry, {
      tenantId: owner.tenantId,
      variant: input.variant,
    })
  ) {
    const { shortLabel } = buildShortcutLabels(owner.cooperativeName)
    const candidates = unaccounted.filter(
      (pin) =>
        !accounted.has(pin.id) && !pin.tenantId && pin.label === shortLabel
    )
    // Exactly one match, so a tile is never adopted by guesswork.
    const legacy = candidates.length === 1 ? candidates[0] : undefined
    if (legacy) {
      accounted.add(legacy.id)
      if (!legacy.enabled) reviveIds.push(legacy.id)
      registry = upsertShortcutAssociation(registry, {
        label: owner.cooperativeName,
        mark: sanitizeShortcutMark(owner.mark),
        shortcutId: legacy.id,
        status: "pin_observed",
        tenantId: owner.tenantId,
        updatedAt: input.now,
        variant: input.variant,
      })
    }
  }

  for (const pin of unaccounted) {
    if (!accounted.has(pin.id) && pin.enabled) disableIds.add(pin.id)
  }

  return { disableIds: [...disableIds], registry, reviveIds }
}
