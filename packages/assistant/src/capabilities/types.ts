/**
 * Capability registry types. Every assistant behavior is a registered
 * capability; an absent capability is disabled. Ported from EwaTrade's
 * `packages/assistant/src/capabilities/types.ts` and rewritten for cooperative
 * roles, permissions and channels.
 */

export const assistantChannels = [
  "web",
  "native",
  "whatsapp",
  "telegram",
] as const
export type AssistantChannel = (typeof assistantChannels)[number]

/** Matches `@halaalvest/auth` cooperative roles without importing auth here. */
export const assistantRoles = [
  "super_admin",
  "tenant_admin",
  "finance_officer",
  "operations_officer",
  "member",
] as const
export type AssistantRole = (typeof assistantRoles)[number]

export const staffAssistantRoles = [
  "super_admin",
  "tenant_admin",
  "finance_officer",
  "operations_officer",
] as const satisfies readonly AssistantRole[]

/**
 * `read` answers with a typed card; `request` saves something for staff review
 * (no ledger effect); `post` writes through a canonical ledger command after
 * an exact reviewed confirmation; `handoff` opens an existing workflow.
 */
export type CapabilityEffect = "read" | "request" | "post" | "handoff"

/**
 * Target delivery mode on a channel. `read`/`review`/`open` are app modes;
 * `bot` answers in the private chat; `link` sends a minimal protected link;
 * `off` is unavailable.
 */
export type ChannelMode = "read" | "review" | "open" | "bot" | "link" | "off"

/** Delivery evidence is recorded separately from the target mode. */
export type ChannelAvailability = {
  mode: ChannelMode
  /** Implemented in source on this channel. */
  source: boolean
  /** Exercised end to end in a Preview environment. */
  previewVerified: boolean
  /** Turned on for traffic (still subject to tenant/channel flags). */
  enabled: boolean
}

export type CapabilityPhase = "1" | "2" | "4A" | "4B" | "4C"

export type CapabilityId =
  | "M01"
  | "M02"
  | "M03"
  | "M04"
  | "M05"
  | "S01"
  | "S02"
  | "S03"
  | "S04"
  | "X01"
  | "X02"

export type AssistantCapability = {
  id: CapabilityId
  phase: CapabilityPhase
  title: string
  /** Short plain wording shown as a suggestion. */
  suggestion: string
  intentExamples: readonly string[]
  effect: CapabilityEffect
  /** Roles that may invoke the capability at all. */
  roles: readonly AssistantRole[]
  /**
   * Existing `@halaalvest/auth` permission rechecked on every read, edit,
   * confirm and delivery. `null` means the capability is own-record only and
   * gated by the linked member profile instead.
   */
  permission: string | null
  /** The existing query or command the capability reuses. */
  source: string
  /** Where "open" sends the user in the signed-in app. */
  destination: string | null
  channels: Record<AssistantChannel, ChannelAvailability>
}
