import type { Charge, ChargeVersion } from "@/components/charge/charge-types"

type RawChargeVersion = {
  amount: number | string | { toString(): string }
  chargeValueType?: "fixed_amount" | "percentage" | null
  effectiveFrom: Date
  id: string
  kind?: string | null
  notes?: string | null
}

type RawCharge = {
  appliesToLoanRequests?: boolean | null
  appliesToLoans?: boolean | null
  appliesToMembers?: boolean | null
  chargeFrequency?:
    | "recurring_monthly"
    | "per_contribution"
    | "one_time"
    | "manual"
    | null
  chargeValueType?: "fixed_amount" | "percentage" | null
  code: string
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
    | null
  versions: RawChargeVersion[]
}

/**
 * Charge definitions with their dated amounts, marked current / scheduled /
 * past against today (the amount in force is the latest one already started).
 */
export function toChargeSettingsRows(
  rows: RawCharge[],
  today = new Date()
): Charge[] {
  return rows.map((charge) => {
    const started = charge.versions.filter(
      (version) => new Date(version.effectiveFrom).getTime() <= today.getTime()
    )
    const currentVersionId = started.at(-1)?.id ?? null
    const versions = charge.versions.map(
      (version): ChargeVersion => ({
        amount: Number(version.amount),
        chargeValueType:
          version.chargeValueType ??
          (version.kind === "percentage" ? "percentage" : "fixed_amount"),
        effectiveFrom: version.effectiveFrom.toISOString().slice(0, 10),
        id: version.id,
        notes: version.notes,
        status:
          currentVersionId === version.id
            ? "current"
            : new Date(version.effectiveFrom).getTime() > today.getTime()
              ? "scheduled"
              : "historical",
      })
    )

    return {
      appliesToLoanRequests: charge.appliesToLoanRequests ?? false,
      appliesToLoans: charge.appliesToLoans ?? false,
      appliesToMembers: charge.appliesToMembers ?? true,
      chargeFrequency: charge.chargeFrequency ?? "recurring_monthly",
      chargeValueType:
        charge.chargeValueType ??
        (charge.kind === "percentage" ? "percentage" : "fixed_amount"),
      code: charge.code,
      currentVersion:
        versions.find((version) => version.status === "current") ??
        versions.at(-1) ??
        null,
      id: charge.id,
      isActive: charge.isActive,
      kind: charge.kind,
      name: charge.name,
      purpose: charge.purpose ?? "general",
      versions,
    }
  })
}
