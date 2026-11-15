import type { ReactNode } from "react"
import { AssistantProvider } from "@/components/general-assistant/assistant-provider"
import { AssistantWorkbench } from "@/components/general-assistant/assistant-workbench"

/**
 * The chat lives in the layout so moving between /assistant and
 * /assistant/c/[id] keeps it mounted: drafts and replies in flight survive.
 * The pages only give each URL its own route. The sidebar layout has already
 * required a signed-in membership; the assistant router re-checks authority
 * on every call.
 */
export default function AssistantLayout({ children }: { children: ReactNode }) {
  return (
    <AssistantProvider>
      <AssistantWorkbench />
      {children}
    </AssistantProvider>
  )
}
