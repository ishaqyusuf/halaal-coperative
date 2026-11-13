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
  // A reserve is a deliberate cooperative policy; new cooperatives start at 0
  // so it never silently absorbs all financing capacity (ADR-20261113).
  reserveBuffer: 0,
  monthlyLevyAmount: null,
  requiresDualLoanApproval: false,
  allowOfflineFinancialCapture: true,
  memberSignupAccessMode: "in_office",
}

export const sampleLoanPolicy = defaultTenantPolicy
