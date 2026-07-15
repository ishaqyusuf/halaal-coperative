"use client"

import { GuarantorApprovalSheet } from "@/components/sheets/guarantor-approval-sheet"
import { NotificationPreferenceSheet } from "@/components/sheets/notification-preference-sheet"

export function GlobalSheets() {
  return (
    <>
      <GuarantorApprovalSheet />
      <NotificationPreferenceSheet />
    </>
  )
}
