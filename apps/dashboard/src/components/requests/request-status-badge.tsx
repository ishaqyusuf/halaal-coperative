"use client"

import { Badge } from "@halaalvest/ui/components/badge"
import { memo } from "react"
import { memberStateToneClassNames } from "@/lib/members/member-status-words"
import {
  getRequestState,
  type RequestStateInput,
} from "@/lib/requests/request-status-words"

/** One plain word for where a request stands (see `getRequestState`). */
export const RequestStatusBadge = memo((props: RequestStateInput) => {
  const state = getRequestState(props)

  return (
    <Badge className={memberStateToneClassNames[state.tone]} variant="outline">
      {state.label}
    </Badge>
  )
})

RequestStatusBadge.displayName = "RequestStatusBadge"
