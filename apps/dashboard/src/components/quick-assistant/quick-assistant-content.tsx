"use client"

import type { ReactNode } from "react"
import { AssistantProvider } from "@/components/general-assistant/assistant-provider"
import { GeneralQuickChat } from "@/components/general-assistant/general-quick-chat"

export function QuickAssistantContent({
  actions,
  active,
  onLeave,
}: {
  actions?: ReactNode
  active?: boolean
  onLeave?: () => void
}) {
  return (
    <AssistantProvider>
      <GeneralQuickChat actions={actions} active={active} onLeave={onLeave} />
    </AssistantProvider>
  )
}
