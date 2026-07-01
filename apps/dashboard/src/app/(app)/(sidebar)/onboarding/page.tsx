import Link from "next/link"
import { getTenantFirstRunOnboardingState } from "@halaalvest/db"
import { Badge } from "@halaalvest/ui/components/badge"
import { buttonVariants } from "@halaalvest/ui/components/button"
import {
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardSurfaceCard,
  TrendPill,
  WorkspaceEmptyState,
  WorkspacePageShell,
} from "@/components/dashboard"
import { getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, workspaceAdminRoles } from "@/lib/workspace-access"

export default async function FirstRunOnboardingPage() {
  const context = await getDashboardServerContext()

  if (!context.tenant) {
    return (
      <WorkspacePageShell
        eyebrow="Onboarding"
        title="Workspace onboarding"
        description="Set up the finance and member foundations before live operations begin."
      >
        <WorkspaceEmptyState
          title="Choose a cooperative workspace first."
          body="First-run onboarding is only available from a cooperative host."
        />
      </WorkspacePageShell>
    )
  }

  const canConfigure = hasAnyRole(
    context.auth.membership?.role,
    workspaceAdminRoles,
  )
  const onboarding = await getTenantFirstRunOnboardingState(context.tenant.id)
  const completionPercent = Math.round(onboarding.completionRatio * 100)
  const nextStep = onboarding.steps.find((step) => !step.complete)

  return (
    <WorkspacePageShell
      actions={
        nextStep && canConfigure ? (
          <Link className={buttonVariants({})} href={nextStep.href}>
            Continue setup
          </Link>
        ) : undefined
      }
      eyebrow="Onboarding"
      title="First-run workspace setup"
      description="Move through the core cooperative setup sequence: charges, shares, business setup, members, migration, loans, and monthly commitments."
    >
      {!canConfigure ? (
        <WorkspaceEmptyState
          title="Admin access is required."
          body="A cooperative admin or super admin must complete the first-run setup before normal workspace operations begin."
        />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <DashboardSurfaceCard>
              <p className="text-xs text-muted-foreground">Roadmap</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">
                {onboarding.completedStepCount}/{onboarding.totalStepCount}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Setup steps completed.
              </p>
            </DashboardSurfaceCard>
            <DashboardSurfaceCard>
              <p className="text-xs text-muted-foreground">Progress</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">
                {completionPercent}%
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Based on saved workspace data.
              </p>
            </DashboardSurfaceCard>
            <DashboardSurfaceCard>
              <p className="text-xs text-muted-foreground">Next step</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">
                {nextStep?.label ?? "Ready"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {nextStep?.description ?? "The first-run checklist is complete."}
              </p>
            </DashboardSurfaceCard>
          </section>

          <DashboardSectionCard>
            <DashboardSectionHeader
              actions={
                <TrendPill tone={nextStep ? "warning" : "positive"}>
                  {nextStep ? "In progress" : "Complete"}
                </TrendPill>
              }
              eyebrow="Sequence"
              title="Setup checklist"
              description="Each step opens the existing workspace screen that owns the underlying data."
            />
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {onboarding.steps.map((step, index) => (
                <DashboardSurfaceCard key={step.key} className="rounded-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Step {index + 1}
                      </p>
                      <h2 className="mt-1 text-lg font-semibold text-foreground">
                        {step.label}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                    <Badge variant={step.complete ? "default" : "secondary"}>
                      {step.complete ? "done" : "todo"}
                    </Badge>
                  </div>
                  <Link
                    className={buttonVariants({
                      className: "mt-4",
                      size: "sm",
                      variant: "outline",
                    })}
                    href={step.href}
                  >
                    {step.complete ? "Review" : "Open"}
                  </Link>
                </DashboardSurfaceCard>
              ))}
            </div>
          </DashboardSectionCard>
        </>
      )}
    </WorkspacePageShell>
  )
}
