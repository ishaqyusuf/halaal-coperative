"use client"

import { type ReactNode, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"

const memberBackfillFooterActionsSlotId = "member-backfill-footer-actions-slot"

export function MemberBackfillFooterActionsSlot() {
  return <div className="contents" id={memberBackfillFooterActionsSlotId} />
}

function getFooterActionsSlot() {
  return typeof document === "undefined"
    ? null
    : document.getElementById(memberBackfillFooterActionsSlotId)
}

function subscribeToFooterActionsSlot(callback: () => void) {
  const frame = window.requestAnimationFrame(callback)

  return () => window.cancelAnimationFrame(frame)
}

export function MemberBackfillFooterPortal({
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
