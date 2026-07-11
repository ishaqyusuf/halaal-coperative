"use client"

import { formatCurrency } from "@halaalvest/utils"

export type WorkflowChargeOption = {
  amount?: number
  chargeValueType: "fixed_amount" | "percentage"
  code: string
  collectionMode: string
  effectiveAmount?: number
  name: string
}

function estimateChargeAmount(
  charge: WorkflowChargeOption,
  basisAmount: number
) {
  const effectiveAmount = Number(charge.effectiveAmount ?? charge.amount ?? 0)

  if (charge.chargeValueType === "percentage") {
    return Number(
      ((Math.max(0, basisAmount) * effectiveAmount) / 100).toFixed(2)
    )
  }

  return effectiveAmount
}

export function WorkflowChargeSummary({
  basisAmount,
  charges,
  title = "Applicable charges",
}: {
  basisAmount: number
  charges: WorkflowChargeOption[]
  title?: string
}) {
  const estimatedCharges = charges
    .map((charge) => ({
      ...charge,
      estimatedAmount: estimateChargeAmount(charge, basisAmount),
    }))
    .filter((charge) => charge.estimatedAmount > 0)
  const total = estimatedCharges.reduce(
    (sum, charge) => sum + charge.estimatedAmount,
    0
  )

  if (estimatedCharges.length === 0) {
    return null
  }

  return (
    <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm">
      <div className="flex items-center justify-between gap-3 font-medium">
        <span>{title}</span>
        <span>{formatCurrency(total)}</span>
      </div>
      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
        {estimatedCharges.map((charge) => (
          <div
            className="flex items-center justify-between gap-3"
            key={`${charge.code}-${charge.collectionMode}`}
          >
            <span>
              {charge.name} ({charge.code}) ·{" "}
              {charge.collectionMode === "pay_separately"
                ? "paid separately"
                : "deducted from savings"}
            </span>
            <span>{formatCurrency(charge.estimatedAmount)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
