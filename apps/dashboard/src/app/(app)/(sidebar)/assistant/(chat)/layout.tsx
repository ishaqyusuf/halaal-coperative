import type { ReactNode } from "react"
import { AssistantWorkbench } from "@/components/general-assistant/assistant-workbench"

/**
 * The chat lives in the layout so moving between /assistant and
 * /assistant/c/[id] keeps it mounted: drafts and replies in flight survive.
 * The pages only give each URL its own route.
 */
export default function AssistantChatLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <>
      <AssistantWorkbench />
      {children}
    </>
  )
}
