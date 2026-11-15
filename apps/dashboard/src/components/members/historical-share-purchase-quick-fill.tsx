"use client"

import { createQaReference } from "@halaalvest/utils"
import { DashboardNativeQuickFill } from "@/components/dashboard-quick-fill"

/**
 * QA Quick Fill for "Add share purchase" (past share units bought). The paid
 * date keeps its default (the member's joined date) so it is always valid.
 */
export function HistoricalSharePurchaseQuickFill({
  disabled,
}: {
  disabled?: boolean
}) {
  return (
    <DashboardNativeQuickFill
      enabled={!disabled}
      values={() => ({
        notes: `Receipt ${createQaReference("RCPT")}`,
        shareUnits: "2",
      })}
    />
  )
}
