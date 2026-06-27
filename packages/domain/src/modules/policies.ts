export interface LoanPolicy {
  eligibilityMultiple: number
  quickLoanTermMonths: number
  normalLoanTermMonths: number
}

export interface TenantPolicySummary extends LoanPolicy {
  reserveBuffer: number
  monthlyLevyAmount: number | null
  requiresDualLoanApproval: boolean
  allowOfflineFinancialCapture: boolean
  memberSignupAccessMode: "disabled" | "hidden" | "in_office" | "public"
}

export const defaultTenantPolicy: TenantPolicySummary = {
  eligibilityMultiple: 2,
  quickLoanTermMonths: 3,
  normalLoanTermMonths: 18,
  reserveBuffer: 450_000,
  monthlyLevyAmount: null,
  requiresDualLoanApproval: false,
  allowOfflineFinancialCapture: true,
  memberSignupAccessMode: "in_office",
}

export const sampleLoanPolicy = defaultTenantPolicy
