import { getWebUrl } from "@/lib/base-url"
import type { AssistantLinkTarget } from "@halaalvest/assistant/contracts"
import { Platform, Share } from "react-native"
import { assistantLinkUrl } from "../model/assistant-saved-link"

/**
 * Opens the system share sheet (Copy is one of its actions) with the
 * website link for a saved answer or draft. Sharing sends nothing to the
 * server; whoever opens the link must be the same signed member.
 */
export async function shareAssistantLink(target: AssistantLinkTarget) {
  const url = assistantLinkUrl(getWebUrl(), target)
  const title = target.kind === "message" ? "Saved answer" : "Draft to review"
  try {
    await Share.share(
      Platform.OS === "ios" ? { url, title } : { message: url, title }
    )
    return true
  } catch {
    return false
  }
}
