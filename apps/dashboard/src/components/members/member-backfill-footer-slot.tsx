"use client"

import { type ReactNode, useEffect, useState } from "react"
import { createPortal } from "react-dom"

const memberBackfillFooterActionsSlotId = "member-backfill-footer-actions-slot"

export function MemberBackfillFooterActionsSlot() {
  return <div className="contents" id={memberBackfillFooterActionsSlotId} />
}

export function MemberBackfillFooterPortal({
  children,
}: {
  children: ReactNode
}) {
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setTargetElement(document.getElementById(memberBackfillFooterActionsSlotId))
  }, [])

  if (!targetElement) {
    return null
  }

  return createPortal(children, targetElement)
}
