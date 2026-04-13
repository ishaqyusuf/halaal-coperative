export type TenantOnboardingStepKey =
  | "tenant_profile"
  | "site_domain"
  | "dashboard_domain"
  | "workspace_owner"
  | "policy_defaults"
  | "ledger_bootstrap"

export type TenantOnboardingStep = {
  key: TenantOnboardingStepKey
  label: string
  description: string
  complete: boolean
}

export type TenantOnboardingSnapshot = {
  status: "complete" | "incomplete"
  completedStepCount: number
  totalStepCount: number
  completionRatio: number
  primarySiteHostname: string | null
  primaryDashboardHostname: string | null
  steps: TenantOnboardingStep[]
}

export function buildTenantOnboardingSnapshot(input: {
  hasTenantProfile: boolean
  hasPrimarySiteDomain: boolean
  hasPrimaryDashboardDomain: boolean
  hasWorkspaceOwner: boolean
  hasPolicyDefaults: boolean
  hasLedgerBootstrap: boolean
  primarySiteHostname?: string | null
  primaryDashboardHostname?: string | null
}): TenantOnboardingSnapshot {
  const steps: TenantOnboardingStep[] = [
    {
      key: "tenant_profile",
      label: "Tenant profile",
      description: "Cooperative name, slug, region, and workspace identity are saved.",
      complete: input.hasTenantProfile,
    },
    {
      key: "site_domain",
      label: "Public site hostname",
      description: "The tenant public website has a primary hostname for routing.",
      complete: input.hasPrimarySiteDomain,
    },
    {
      key: "dashboard_domain",
      label: "Dashboard hostname",
      description: "The tenant dashboard resolves through a dedicated workspace hostname.",
      complete: input.hasPrimaryDashboardDomain,
    },
    {
      key: "workspace_owner",
      label: "Workspace owner",
      description: "A tenant admin account and default membership are assigned.",
      complete: input.hasWorkspaceOwner,
    },
    {
      key: "policy_defaults",
      label: "Policy defaults",
      description: "Core savings, levy, reserve, and approval defaults are configured.",
      complete: input.hasPolicyDefaults,
    },
    {
      key: "ledger_bootstrap",
      label: "Ledger bootstrap",
      description: "The baseline chart of accounts has been provisioned for money flows.",
      complete: input.hasLedgerBootstrap,
    },
  ]

  const completedStepCount = steps.filter((step) => step.complete).length
  const totalStepCount = steps.length

  return {
    status: completedStepCount === totalStepCount ? "complete" : "incomplete",
    completedStepCount,
    totalStepCount,
    completionRatio: totalStepCount > 0 ? completedStepCount / totalStepCount : 0,
    primarySiteHostname: input.primarySiteHostname ?? null,
    primaryDashboardHostname: input.primaryDashboardHostname ?? null,
    steps,
  }
}
