import { AssistantSavedLinkRouteController } from "@/features/assistant/routes/assistant-saved-link-route-controller"
import { useLocalSearchParams } from "expo-router"

/** Saved-answer link, same path as the website. The controller checks it. */
export default function AssistantSavedAnswerRoute() {
  const { messageId } = useLocalSearchParams<{ messageId?: string | string[] }>()
  return <AssistantSavedLinkRouteController kind="message" id={messageId} />
}
