/** A charge type with its dated amounts (Finance setup). */
export type ChargeVersion = {
  amount: number
  chargeValueType: "fixed_amount" | "percentage"
  effectiveFrom: string
  id: string
  notes?: string | null
  status: "current" | "historical" | "scheduled"
}

export type Charge = {
  appliesToLoanRequests?: boolean
  appliesToLoans?: boolean
  appliesToMembers?: boolean
  chargeFrequency:
    | "recurring_monthly"
    | "per_contribution"
    | "one_time"
    | "manual"
  chargeValueType: "fixed_amount" | "percentage"
  code: string
  currentVersion?: ChargeVersion | null
  id: string
  isActive: boolean
  kind: string
  name: string
  purpose?:
    | "general"
    | "member_share"
    | "loan_fee"
    | "membership_fee"
    | "penalty"
  versions: ChargeVersion[]
}
