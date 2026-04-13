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
}

export const defaultTenantPolicy: TenantPolicySummary = {
  eligibilityMultiple: 2,
  quickLoanTermMonths: 3,
  normalLoanTermMonths: 18,
  reserveBuffer: 450_000,
  monthlyLevyAmount: null,
  requiresDualLoanApproval: false,
  allowOfflineFinancialCapture: true,
}

export const sampleLoanPolicy = defaultTenantPolicy
