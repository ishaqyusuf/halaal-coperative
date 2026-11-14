"use client"

import { MembershipApprovalSheet } from "@/components/sheets/membership-approval-sheet"
import { NotificationPreferenceSheet } from "@/components/sheets/notification-preference-sheet"

export function GlobalSheets() {
  return (
    <>
      <MembershipApprovalSheet />
      <NotificationPreferenceSheet />
    </>
  )
}
