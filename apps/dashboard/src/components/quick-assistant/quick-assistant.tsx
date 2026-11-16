"use client"

import { Button } from "@halaalvest/ui/components/button"
import { SparklesIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  isQuickAssistantShortcut,
  useQuickAssistantRequests,
} from "./quick-assistant-requests"

const QuickAssistantPanel = dynamic(
  () =>
    import("./quick-assistant-panel").then((mod) => mod.QuickAssistantPanel),
  { ssr: false }
)

/** Assistant routes show the full chat, so the quick panel stays out. */
export function isAssistantPath(pathname: string) {
  return pathname === "/assistant" || pathname.startsWith("/assistant/")
}

/**
 * The dashboard header's assistant button and its floating chat (ported
 * from EwaTrade's quick assistant). ⌘J / Ctrl+J toggles it; record pages
 * open it with a composer prefill through `requestQuickAssistant`.
 */
export function QuickAssistant() {
  const [opened, setOpened] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const pathname = usePathname()
  const onAssistantPage = isAssistantPath(pathname)

  const minimize = useCallback(() => {
    setOpened(false)
    requestAnimationFrame(() => triggerRef.current?.focus())
  }, [])
  const open = useCallback(() => {
    setInitialized(true)
    setOpened(true)
  }, [])

  // On the assistant page the request falls through to that page's chat.
  return onAssistantPage ? null : (
    <QuickAssistantLauncher
      opened={opened}
      initialized={initialized}
      triggerRef={triggerRef}
      open={open}
      minimize={minimize}
    />
  )
}

function QuickAssistantLauncher({
  opened,
  initialized,
  triggerRef,
  open,
  minimize,
}: {
  opened: boolean
  initialized: boolean
  triggerRef: React.RefObject<HTMLButtonElement | null>
  open: () => void
  minimize: () => void
}) {
  useQuickAssistantRequests(open)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return
      if (!isQuickAssistantShortcut(event)) return
      event.preventDefault()
      if (opened) minimize()
      else open()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [opened, open, minimize])

  return (
    <>
      <Button
        size="touch"
        ref={triggerRef}
        type="button"
        variant="ghost"
        className="gap-2 rounded-full px-3 sm:h-9"
        aria-label="Open quick assistant"
        aria-haspopup="dialog"
        aria-expanded={opened}
        aria-controls={initialized ? "quick-assistant-panel" : undefined}
        aria-keyshortcuts="Meta+J Control+J"
        title="Assistant (⌘J / Ctrl+J)"
        onClick={() => (opened ? minimize() : open())}
      >
        <HugeiconsIcon icon={SparklesIcon} className="size-5 text-primary" />
        <span className="max-md:sr-only">Ask</span>
        <kbd className="hidden rounded border px-1 font-sans text-[10px] text-muted-foreground lg:inline">
          ⌘J
        </kbd>
      </Button>
      {initialized ? (
        <QuickAssistantPanel opened={opened} onMinimize={minimize} />
      ) : null}
    </>
  )
}
