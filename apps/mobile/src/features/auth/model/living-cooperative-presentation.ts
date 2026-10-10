export type LivingCooperativePresentation = {
  accessibilityLabel: string
  actionLabel: string
  accent: string | null
  formTitle: string
  lead: string
}

function headlineTenantName(tenantName: string) {
  return tenantName.replace(/\s+co-?operative$/i, "").trim() || tenantName
}

export function getLivingCooperativePresentation({
  hasVerifiedProfile,
  isSubmitting,
  largeTextLayout,
  tenantName,
}: {
  hasVerifiedProfile: boolean
  isSubmitting: boolean
  largeTextLayout: boolean
  tenantName?: string | null
}): LivingCooperativePresentation {
  if (hasVerifiedProfile) {
    const verifiedTenantName = tenantName?.trim() || "your cooperative"

    return {
      accessibilityLabel: `Welcome back to ${verifiedTenantName}. Cooperative confirmed.`,
      actionLabel: "Opening cooperative",
      accent: largeTextLayout
        ? null
        : `${headlineTenantName(verifiedTenantName)}.`,
      formTitle: largeTextLayout ? "Sign in" : "",
      lead: largeTextLayout ? "" : "Welcome back to",
    }
  }

  return {
    accessibilityLabel: "Welcome back to HalaalVest.",
    actionLabel: isSubmitting ? "Finding cooperative" : "Sign in",
    accent: null,
    formTitle: "Sign in",
    lead: largeTextLayout ? "" : "Welcome back.",
  }
}
