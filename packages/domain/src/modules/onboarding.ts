export type TenantOnboardingStepKey =
  | "tenant_profile"
  | "site_domain"
  | "workspace_access"
  | "workspace_owner"
  | "policy_defaults"
  | "charge_setup"
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
  hasWorkspaceAccess: boolean
  hasWorkspaceOwner: boolean
  hasPolicyDefaults: boolean
  hasChargeSetup: boolean
  hasLedgerBootstrap: boolean
  primarySiteHostname?: string | null
  primaryDashboardHostname?: string | null
}): TenantOnboardingSnapshot {
  const steps: TenantOnboardingStep[] = [
    {
      key: "tenant_profile",
      label: "Cooperative profile",
      description:
        "Cooperative name, slug, region, and workspace identity are saved.",
      complete: input.hasTenantProfile,
    },
    {
      key: "site_domain",
      label: "Public site hostname",
      description:
        "The cooperative public website has a primary hostname for routing.",
      complete: input.hasPrimarySiteDomain,
    },
    {
      key: "workspace_access",
      label: "Workspace app route",
      description:
        "The cooperative hostname also serves the authenticated workspace under /app.",
      complete: input.hasWorkspaceAccess,
    },
    {
      key: "workspace_owner",
      label: "Workspace owner",
      description:
        "A cooperative admin account and default membership are assigned.",
      complete: input.hasWorkspaceOwner,
    },
    {
      key: "policy_defaults",
      label: "Policy defaults",
      description:
        "Core savings, levy, reserve, and approval defaults are configured.",
      complete: input.hasPolicyDefaults,
    },
    {
      key: "charge_setup",
      label: "Charges setup",
      description:
        "At least one active cooperative charge definition is ready for member finance workflows.",
      complete: input.hasChargeSetup,
    },
    {
      key: "ledger_bootstrap",
      label: "Ledger bootstrap",
      description:
        "The baseline chart of accounts has been provisioned for money flows.",
      complete: input.hasLedgerBootstrap,
    },
  ]

  const completedStepCount = steps.filter((step) => step.complete).length
  const totalStepCount = steps.length

  return {
    status: completedStepCount === totalStepCount ? "complete" : "incomplete",
    completedStepCount,
    totalStepCount,
    completionRatio:
      totalStepCount > 0 ? completedStepCount / totalStepCount : 0,
    primarySiteHostname: input.primarySiteHostname ?? null,
    primaryDashboardHostname:
      input.primaryDashboardHostname ?? input.primarySiteHostname ?? null,
    steps,
  }
}
