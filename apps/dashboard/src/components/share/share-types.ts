/** A dated monthly share amount (Finance setup). */
export type Share = {
  amount: number
  basis: "after_charge_deductions"
  effectiveFrom: string
  id: string
  isCurrent: boolean
  notes?: string | null
  valueType: "fixed_amount" | "percentage"
}
