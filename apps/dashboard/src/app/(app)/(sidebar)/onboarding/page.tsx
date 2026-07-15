import { getTenantFirstRunOnboardingState } from "@halaalvest/db"
import {
  FirstRunOnboardingUnavailableView,
  FirstRunOnboardingView,
} from "@/components/first-run-onboarding-view"
import { getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, workspaceAdminRoles } from "@/lib/workspace-access"

export default async function FirstRunOnboardingPage() {
  const context = await getDashboardServerContext()

  if (!context.tenant) {
    return <FirstRunOnboardingUnavailableView />
  }

  const canConfigure = hasAnyRole(
    context.auth.membership?.role,
    workspaceAdminRoles
  )
  const onboarding = await getTenantFirstRunOnboardingState(context.tenant.id)

  return (
    <FirstRunOnboardingView
      canConfigure={canConfigure}
      onboarding={onboarding}
    />
  )
}
