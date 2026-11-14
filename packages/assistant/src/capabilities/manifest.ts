import {
  type AssistantCapability,
  type AssistantChannel,
  type AssistantRole,
  type CapabilityId,
  type ChannelAvailability,
  type ChannelMode,
  staffAssistantRoles,
} from "./types"

const memberRoles = ["member"] as const satisfies readonly AssistantRole[]

/** Implemented in source but not yet Preview-verified or enabled for traffic. */
function built(mode: ChannelMode): ChannelAvailability {
  return {
    mode,
    source: mode !== "off",
    previewVerified: false,
    enabled: mode !== "off",
  }
}

/** Messaging channels start in source only; enablement is a flag decision. */
function gated(mode: ChannelMode): ChannelAvailability {
  return { mode, source: mode !== "off", previewVerified: false, enabled: false }
}

function channels(
  app: ChannelMode,
  whatsapp: ChannelMode,
  telegram: ChannelMode
): Record<AssistantChannel, ChannelAvailability> {
  return {
    web: built(app),
    native: built(app),
    whatsapp: gated(whatsapp),
    telegram: gated(telegram),
  }
}

/**
 * First-release registry (plan §1, checklist rows M01–M05, S01–S04, X01–X02).
 * Later rows are added here as they are delivered; anything absent is off.
 */
export const assistantCapabilities = [
  {
    id: "M01",
    phase: "1",
    title: "Financing status",
    suggestion: "What's my loan status?",
    intentExamples: [
      "What's my loan status?",
      "When is my next repayment?",
      "How much do I still owe on my financing?",
    ],
    effect: "read",
    roles: memberRoles,
    permission: "view_own_member_profile",
    source: "getMemberFinancingSnapshot (mobile-member-financing.route.ts)",
    destination: "/loans",
    channels: channels("read", "link", "bot"),
  },
  {
    id: "M02",
    phase: "1",
    title: "Savings, shares and profit",
    suggestion: "What are my total investments?",
    intentExamples: [
      "What are my total investments?",
      "How much is in my savings?",
      "How many shares do I have?",
    ],
    effect: "read",
    roles: memberRoles,
    permission: "view_own_member_profile",
    source: "getMemberStatementSummary (members.ts)",
    destination: "/contributions",
    channels: channels("read", "link", "bot"),
  },
  {
    id: "M03",
    phase: "1",
    title: "My receipts",
    suggestion: "Has my receipt been approved?",
    intentExamples: [
      "Has my ₦25,000 receipt been approved?",
      "Show my receipts",
    ],
    effect: "read",
    roles: memberRoles,
    permission: "submit_receipts",
    source: "listMemberPaymentReceipts (payment-receipts.ts)",
    destination: "/payment-receipts",
    channels: channels("read", "bot", "bot"),
  },
  {
    id: "M04",
    phase: "2",
    title: "Submit a receipt",
    suggestion: "Here's proof I paid",
    intentExamples: [
      "I transferred ₦25,000. Here's my receipt.",
      "Submit a payment receipt",
    ],
    effect: "request",
    roles: memberRoles,
    permission: "submit_receipts",
    source: "createMemberPaymentReceipt (payment-receipts.ts)",
    destination: "/payment-receipts",
    channels: channels("review", "link", "link"),
  },
  {
    id: "M05",
    phase: "2",
    title: "Request payment",
    suggestion: "I want to request payment",
    intentExamples: [
      "I want to request payment",
      "I want a refund of my special savings",
    ],
    effect: "request",
    roles: memberRoles,
    permission: null,
    source: "createMemberSupportCase (support.ts, payment_issue)",
    destination: "/support",
    channels: channels("review", "off", "bot"),
  },
  {
    id: "S01",
    phase: "1",
    title: "Find a member",
    suggestion: "Find a member",
    intentExamples: ["Find Aisha Bello", "Open HV-1048"],
    effect: "read",
    roles: staffAssistantRoles,
    permission: "manage_members",
    source: "listMembers (members.ts)",
    destination: "/members",
    channels: channels("read", "link", "link"),
  },
  {
    id: "S02",
    phase: "1",
    title: "Member history",
    suggestion: "Show a member's history",
    intentExamples: ["Show HV-1048's history for October"],
    effect: "read",
    roles: staffAssistantRoles,
    permission: "manage_members",
    source: "getMemberStatementSummary + listMemberPaymentReceipts",
    destination: "/members",
    channels: channels("read", "link", "link"),
  },
  {
    id: "S03",
    phase: "1",
    title: "Receipts to review",
    suggestion: "Which receipts need review?",
    intentExamples: ["Which receipts need review?", "Pending receipts"],
    effect: "read",
    roles: staffAssistantRoles,
    permission: "review_receipts",
    source: "listPaymentReceiptsForReview (payment-receipts.ts)",
    destination: "/payment-receipts",
    channels: channels("read", "link", "bot"),
  },
  {
    id: "S04",
    phase: "2",
    title: "Record a payment",
    suggestion: "Record a member payment",
    intentExamples: ["Record ₦25,000 from member HV-1048 for November"],
    effect: "post",
    roles: staffAssistantRoles,
    permission: "manage_member_contributions",
    source: "recordMemberPayment (contributions.ts)",
    destination: "/contributions",
    channels: channels("review", "link", "link"),
  },
  {
    id: "X01",
    phase: "1",
    title: "Help and account connection",
    suggestion: "What can you help with?",
    intentExamples: ["help", "What can you do?"],
    effect: "read",
    roles: [...staffAssistantRoles, ...memberRoles],
    permission: null,
    source: "capability registry",
    destination: null,
    channels: channels("read", "bot", "bot"),
  },
  {
    id: "X02",
    phase: "1",
    title: "Clarify and hand off",
    suggestion: "Talk to a person",
    intentExamples: ["I need to talk to someone"],
    effect: "handoff",
    roles: [...staffAssistantRoles, ...memberRoles],
    permission: null,
    source: "support workflow",
    destination: "/support",
    channels: channels("open", "bot", "bot"),
  },
] as const satisfies readonly AssistantCapability[]

const byId = new Map<CapabilityId, AssistantCapability>(
  assistantCapabilities.map((capability) => [capability.id, capability])
)

export function getAssistantCapability(id: CapabilityId) {
  return byId.get(id) ?? null
}

/**
 * Role + channel gate from the registry. The caller still rechecks the named
 * permission and record scope against the live membership before any read
 * or write; this is only the first, static filter.
 */
export function capabilityAllowed(
  id: CapabilityId,
  role: AssistantRole,
  channel: AssistantChannel,
  options: { messagingChannelEnabled?: boolean } = {}
) {
  const capability = byId.get(id)
  if (!capability) return false
  if (!(capability.roles as readonly AssistantRole[]).includes(role))
    return false
  const availability = capability.channels[channel]
  if (availability.mode === "off" || !availability.source) return false
  // Messaging channels stay off until the runtime channel flag turns them on.
  if (channel === "whatsapp" || channel === "telegram")
    return availability.enabled || options.messagingChannelEnabled === true
  return availability.enabled
}

export function capabilitiesFor(
  role: AssistantRole,
  channel: AssistantChannel,
  options: { messagingChannelEnabled?: boolean } = {}
) {
  return assistantCapabilities.filter((capability) =>
    capabilityAllowed(capability.id, role, channel, options)
  )
}

/** The channel mode a capability renders in, or `off`. */
export function capabilityMode(
  id: CapabilityId,
  channel: AssistantChannel
): ChannelMode {
  return byId.get(id)?.channels[channel].mode ?? "off"
}
