import type { AssistantChannel, AssistantRole } from "@halaalvest/assistant"

/**
 * The authority one assistant turn runs with. Web/native build it from the
 * signed tRPC session; WhatsApp/Telegram build it from an active channel link
 * after re-resolving the membership. Role, user and tenant never come from a
 * prompt, forwarded message, query parameter or client header.
 */
export type AssistantPrincipal = {
  tenantId: string
  tenantName: string
  userId: string
  membershipId: string
  role: AssistantRole
  channel: AssistantChannel
  /** Present for messaging channels: the active link this turn runs under. */
  channelLinkId: string | null
}

export function isStaffPrincipal(principal: AssistantPrincipal) {
  return principal.role !== "member"
}
