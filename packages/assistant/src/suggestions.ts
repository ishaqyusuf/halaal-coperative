import { capabilitiesFor } from "./capabilities/manifest"
import type { AssistantChannel, AssistantRole } from "./capabilities/types"

/** Role- and channel-shaped suggestions, built only from the registry. */
export function assistantSuggestions(
  role: AssistantRole,
  channel: AssistantChannel,
  limit = 4
) {
  return capabilitiesFor(role, channel)
    .filter((capability) => capability.id !== "X01" && capability.id !== "X02")
    .slice(0, limit)
    .map((capability) => ({
      capabilityId: capability.id,
      label: capability.suggestion,
    }))
}

export function assistantHelpItems(role: AssistantRole, channel: AssistantChannel) {
  return capabilitiesFor(role, channel).map((capability) => ({
    capabilityId: capability.id,
    title: capability.title,
    suggestion: capability.suggestion,
  }))
}
