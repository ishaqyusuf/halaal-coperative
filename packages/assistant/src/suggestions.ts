import { capabilitiesFor } from "./capabilities/manifest"
import type { AssistantChannel, AssistantRole } from "./capabilities/types"

/** Role- and channel-shaped suggestions, built only from the registry. */
export function assistantSuggestions(
  role: AssistantRole,
  channel: AssistantChannel,
  limit = 4,
  options: { messagingChannelEnabled?: boolean } = {}
) {
  return capabilitiesFor(role, channel, options)
    .filter((capability) => capability.id !== "X01" && capability.id !== "X02")
    .slice(0, limit)
    .map((capability) => ({
      capabilityId: capability.id,
      label: capability.suggestion,
    }))
}

export function assistantHelpItems(
  role: AssistantRole,
  channel: AssistantChannel,
  options: { messagingChannelEnabled?: boolean } = {}
) {
  return capabilitiesFor(role, channel, options).map((capability) => ({
    capabilityId: capability.id,
    title: capability.title,
    suggestion: capability.suggestion,
  }))
}
