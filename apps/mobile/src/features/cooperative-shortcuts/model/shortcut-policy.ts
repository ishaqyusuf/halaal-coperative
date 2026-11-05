import { parseShortcutId } from "./shortcut-intent"
import {
  findShortcutAssociation,
  findShortcutById,
  type ShortcutAssociation,
  type ShortcutRegistry,
} from "./shortcut-state"

export type ShortcutSupport =
  | "checking"
  | "supported"
  | "unsupported_os"
  | "unsupported_launcher"
  | "user_locked"
  | "unavailable"

export type WorkspaceMembership = {
  id: string
  isDefault: boolean
  role: string
  workspaceRole: "admin" | "member"
}

export type CooperativeWorkspace = {
  isCurrent: boolean
  memberships: WorkspaceMembership[]
  tenant: { id: string; logoUrl: string | null; mark: string; name: string }
}

export type ShortcutLaunchDecision =
  | { kind: "invalid" }
  | { kind: "wait" }
  | { kind: "sign-in" }
  | { kind: "unknown" }
  | { kind: "enter" }
  | { kind: "offline" }
  | { association: ShortcutAssociation; kind: "switch-needed" }

/**
 * Decides what a shortcut tap may do before any context change. A shortcut is
 * a navigation preference: it never signs in, never adopts another account's
 * mapping and never switches tenant from cached metadata while offline.
 */
export function decideShortcutLaunch(input: {
  authInitializing: boolean
  locked: boolean
  online: boolean
  profile: { tenantId: string; userId: string } | null
  registry: ShortcutRegistry
  shortcutId: unknown
  variant: string
}): ShortcutLaunchDecision {
  const shortcutId = parseShortcutId(input.shortcutId)
  if (!shortcutId) return { kind: "invalid" }
  if (input.authInitializing) return { kind: "wait" }
  if (!input.profile) return { kind: "sign-in" }
  if (input.locked) return { kind: "wait" }

  const association = findShortcutById(input.registry, shortcutId)
  if (
    !association ||
    association.userId !== input.profile.userId ||
    association.variant !== input.variant ||
    association.status === "disabled"
  ) {
    return { kind: "unknown" }
  }
  if (association.tenantId === input.profile.tenantId) return { kind: "enter" }
  if (!input.online) return { kind: "offline" }
  return { association, kind: "switch-needed" }
}

export type ShortcutSwitchDecision =
  | { kind: "unavailable" }
  | { kind: "switch"; membershipId: string }
  | { kind: "choose-role"; memberships: WorkspaceMembership[] }

/**
 * Picks the membership to enter from fresh server discovery. A saved
 * preference is used only while still authorized; several roles without one
 * need an explicit choice rather than inferring privilege from an icon.
 */
export function resolveShortcutSwitch(
  association: ShortcutAssociation,
  workspaces: readonly CooperativeWorkspace[]
): ShortcutSwitchDecision {
  const workspace = workspaces.find(
    (item) => item.tenant.id === association.tenantId
  )
  if (!workspace || workspace.memberships.length === 0) {
    return { kind: "unavailable" }
  }
  const preferred = workspace.memberships.find(
    (item) => item.id === association.membershipId
  )
  if (preferred) return { kind: "switch", membershipId: preferred.id }
  if (workspace.memberships.length === 1) {
    return { kind: "switch", membershipId: workspace.memberships[0]!.id }
  }
  return { kind: "choose-role", memberships: workspace.memberships }
}

export function shouldOfferCooperativeShortcut(input: {
  accessAllowed: boolean
  locked: boolean
  mockSession: boolean
  pathname: string
  profile: {
    qaAuthorized?: boolean
    tenantId: string
    userId: string
  } | null
  registry: ShortcutRegistry
  support: ShortcutSupport
  variant: string
}) {
  if (input.support !== "supported" || !input.profile) return false
  if (input.mockSession || input.profile.qaAuthorized) return false
  if (!input.accessAllowed || input.locked || input.pathname !== "/") {
    return false
  }
  return (
    findShortcutAssociation(input.registry, {
      tenantId: input.profile.tenantId,
      userId: input.profile.userId,
      variant: input.variant,
    }) === null
  )
}

export const PENDING_SHORTCUT_TTL_MS = 10 * 60 * 1000

/**
 * Short-lived, in-memory destination that survives the ordinary sign-in flow.
 * Each launch is consumed once; logout, cancellation and expiry clear it.
 */
export function createPendingShortcutStore(now: () => number = Date.now) {
  let pending: { at: number; shortcutId: string } | null = null
  return {
    clear() {
      pending = null
    },
    peek() {
      if (pending && now() - pending.at > PENDING_SHORTCUT_TTL_MS)
        pending = null
      return pending?.shortcutId ?? null
    },
    set(shortcutId: string) {
      const valid = parseShortcutId(shortcutId)
      pending = valid ? { at: now(), shortcutId: valid } : null
    },
    take() {
      const value = this.peek()
      pending = null
      return value
    },
  }
}

export type ShortcutPresentation = {
  actions: ("add" | "retry" | "refresh" | "disable")[]
  description: string
  title: string
}

export function describeShortcutState(input: {
  association: ShortcutAssociation | null
  support: ShortcutSupport
}): ShortcutPresentation {
  switch (input.support) {
    case "checking":
      return {
        actions: [],
        description: "Checking your launcher…",
        title: "Home-screen shortcut",
      }
    case "unsupported_os":
      return {
        actions: [],
        description:
          "Cooperative shortcuts need Android 8 or newer. Keep using the HalaalVest icon.",
        title: "Not available on this phone",
      }
    case "unsupported_launcher":
      return {
        actions: [],
        description:
          "Your current launcher does not accept pinned shortcuts. Keep using the HalaalVest icon.",
        title: "Not available with this launcher",
      }
    case "user_locked":
      return {
        actions: [],
        description: "Unlock your phone, then try again.",
        title: "Phone is locked",
      }
    case "unavailable":
      return {
        actions: [],
        description:
          "Cooperative shortcuts need the latest HalaalVest app from your store.",
        title: "Not available in this version",
      }
    case "supported":
      break
  }
  switch (input.association?.status ?? "not_offered") {
    case "request_prepared":
    case "request_sent":
      return {
        actions: ["retry", "disable"],
        description:
          "Confirm on your launcher. If you dismissed it, you can try again.",
        title: "Waiting for your launcher",
      }
    case "pin_observed":
      return {
        actions: ["refresh", "disable"],
        description:
          "Opens HalaalVest in this cooperative. The HalaalVest icon still works as usual.",
        title: "Added to your home screen",
      }
    case "disabled":
      return {
        actions: ["add"],
        description:
          "Shortcut disabled. You can remove its tile from your launcher.",
        title: "Shortcut disabled",
      }
    default:
      return {
        actions: ["add"],
        description:
          "Add this cooperative to your home screen. It opens in HalaalVest with your usual sign-in and app lock.",
        title: "Home-screen shortcut",
      }
  }
}

export const SHORTCUT_DISABLED_MESSAGE =
  "Sign in to HalaalVest to add this shortcut again."

export const SHORTCUT_REMOVAL_INSTRUCTIONS =
  "To remove a tile, long-press it on your home screen and choose Remove. This does not uninstall HalaalVest."

export const SHORTCUT_PRIVACY_NOTICE =
  "The cooperative name and icon are visible to anyone who uses this phone's launcher, and the launcher may keep them after you sign out."

export function formatMembershipRole(role: string) {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}
