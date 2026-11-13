"use client"

import { GuarantorApprovalSheet } from "@/components/sheets/guarantor-approval-sheet"
import { MembershipApprovalSheet } from "@/components/sheets/membership-approval-sheet"
import { NotificationPreferenceSheet } from "@/components/sheets/notification-preference-sheet"

export function GlobalSheets() {
  return (
    <>
      <GuarantorApprovalSheet />
      <MembershipApprovalSheet />
      <NotificationPreferenceSheet />
    </>
  )
}
