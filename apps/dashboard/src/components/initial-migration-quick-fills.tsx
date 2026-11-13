"use client"

import { qaDateOffset } from "@halaalvest/utils"
import { DashboardNativeQuickFill } from "@/components/dashboard-quick-fill"

// Client wrappers so the server-rendered migration forms can show Quick Fill
// with serializable props only.

export function ProfitMigrationAdjustmentQuickFill({
  disabled,
  editableAvailableAmount,
}: {
  disabled: boolean
  editableAvailableAmount: number
}) {
  return (
    <DashboardNativeQuickFill
      enabled={!disabled}
      values={() => ({
        allocatedProfitAmount: String(
          Math.round(editableAvailableAmount / 4) || 0
        ),
      })}
    />
  )
}

export function LegacyLoanDraftCreateQuickFill({
  className,
  memberId,
}: {
  className?: string
  memberId?: string
}) {
  return (
    <DashboardNativeQuickFill
      className={className}
      values={() => ({
        loanLabel: "Legacy Murabaha A",
        memberId,
        notes: "Transcribed from the 2024 loan register.",
        openedAt: qaDateOffset(-540),
        outstandingPrincipalBalance: "150000",
        principalAmount: "300000",
        savingsDuringLoan: "5000",
        scheduledMonthlyPrincipalRepayment: "25000",
      })}
    />
  )
}

export function LegacyLoanDraftEditQuickFill() {
  return (
    <DashboardNativeQuickFill
      values={() => ({
        notes: "Corrected against the 2024 loan register.",
        outstandingPrincipalBalance: "120000",
        scheduledMonthlyPrincipalRepayment: "25000",
      })}
    />
  )
}
