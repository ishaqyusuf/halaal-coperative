import type { ReactNode } from "react"
import { AssistantProvider } from "@/components/general-assistant/assistant-provider"

/**
 * Every assistant route shares one router client. The chat workbench lives
 * in `(chat)/layout.tsx`; saved-answer (`m/[messageId]`) and draft
 * (`review/[proposalId]`) links are focused pages without it. The sidebar
 * layout has already required a signed-in membership; the assistant router
 * re-checks authority on every call.
 */
export default function AssistantLayout({ children }: { children: ReactNode }) {
  return <AssistantProvider>{children}</AssistantProvider>
}
