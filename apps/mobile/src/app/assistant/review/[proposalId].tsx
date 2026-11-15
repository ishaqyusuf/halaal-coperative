import { AssistantSavedLinkRouteController } from "@/features/assistant/routes/assistant-saved-link-route-controller"
import { useLocalSearchParams } from "expo-router"

/** Draft link, same path as the website. Opening it never confirms. */
export default function AssistantDraftReviewRoute() {
  const { proposalId } = useLocalSearchParams<{ proposalId?: string | string[] }>()
  return <AssistantSavedLinkRouteController kind="proposal" id={proposalId} />
}
