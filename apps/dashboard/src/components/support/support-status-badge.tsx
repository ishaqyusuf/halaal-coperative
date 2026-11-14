"use client"

import { Badge } from "@halaalvest/ui/components/badge"
import type {
  SupportCaseMessageAuthorType,
  SupportCaseStatus,
} from "@halaalvest/db"
import { memo } from "react"
import { memberStateToneClassNames } from "@/lib/members/member-status-words"
import {
  getSupportCaseState,
  type SupportViewer,
} from "@/lib/support/support-words"

/** One plain word for where a case stands, from the viewer's side. */
export const SupportStatusBadge = memo(
  ({
    lastAuthor,
    status,
    viewer,
  }: {
    lastAuthor?: SupportCaseMessageAuthorType | null
    status: SupportCaseStatus
    viewer: SupportViewer
  }) => {
    const state = getSupportCaseState({ lastAuthor, status }, viewer)

    return (
      <Badge
        className={`text-sm ${memberStateToneClassNames[state.tone]}`}
        variant="outline"
      >
        {state.label}
      </Badge>
    )
  }
)

SupportStatusBadge.displayName = "SupportStatusBadge"
