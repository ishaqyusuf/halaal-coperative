"use client"

import { type ReactNode, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"

const gettingStartedFooterActionsSlotId = "getting-started-footer-actions-slot"

export function GettingStartedFooterActionsSlot() {
  return <div className="contents" id={gettingStartedFooterActionsSlotId} />
}

function getFooterActionsSlot() {
  return typeof document === "undefined"
    ? null
    : document.getElementById(gettingStartedFooterActionsSlotId)
}

function subscribeToFooterActionsSlot(callback: () => void) {
  const frame = window.requestAnimationFrame(callback)

  return () => window.cancelAnimationFrame(frame)
}

export function GettingStartedFooterPortal({
  children,
}: {
  children: ReactNode
}) {
  const targetElement = useSyncExternalStore(
    subscribeToFooterActionsSlot,
    getFooterActionsSlot,
    () => null
  )

  if (!targetElement) {
    return null
  }

  return createPortal(children, targetElement)
}
