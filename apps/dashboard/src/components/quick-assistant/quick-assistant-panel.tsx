"use client"

import { Button } from "@halaalvest/ui/components/button"
import { ArrowExpand01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState } from "react"
import { QuickAssistantContent } from "./quick-assistant-content"
import {
  QuickAssistantFrame,
  QuickAssistantMinimize,
} from "./quick-assistant-frame"

export function QuickAssistantPanel({
  opened,
  onMinimize,
}: {
  opened: boolean
  onMinimize: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <QuickAssistantFrame
      expanded={expanded}
      opened={opened}
      onMinimize={onMinimize}
    >
      <QuickAssistantContent
        active={opened}
        onLeave={onMinimize}
        actions={
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="max-sm:hidden"
              aria-label={expanded ? "Restore chat size" : "Expand chat"}
              aria-pressed={expanded}
              title={expanded ? "Restore chat size" : "Expand chat"}
              onClick={() => setExpanded((value) => !value)}
            >
              <HugeiconsIcon icon={ArrowExpand01Icon} className="size-4" />
            </Button>
            <QuickAssistantMinimize onMinimize={onMinimize} />
          </>
        }
      />
    </QuickAssistantFrame>
  )
}
