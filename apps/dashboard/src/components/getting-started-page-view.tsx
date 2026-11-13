import {
  DashboardPageShell,
  WorkspaceEmptyState,
  WorkspacePageShell,
} from "@/components/dashboard"
import { SharesChargesStep } from "@/components/getting-started/shares-charges-step"
import { ProfitSharingStep } from "@/components/getting-started/profit-sharing-step"
import { ProfitSeasonsReviewStep } from "@/components/getting-started/profit-seasons-review-step"
import { GoLiveChecklist } from "@/components/go-live-checklist"
import { OnePathRail } from "@/components/one-path/one-path-rail"
import { OnePathStep } from "@/components/one-path/one-path-step"
import { ReviewSetupStep } from "@/components/one-path/review-setup-step"
import { SetupModeStep } from "@/components/one-path/setup-mode-step"
import { OperationProfileSetupForm } from "@/components/operation-profile-setup-form"
import type { GettingStartedPageViewProps } from "@/lib/getting-started/getting-started-page-types"
import {
  buildOnePathRailSteps,
  getGettingStartedStepHref,
  getJourneyStepKey,
  getNextGettingStartedStep,
  getPreviousGettingStartedStep,
  isGettingStartedStepComplete,
  type GettingStartedProgressInput,
} from "@/lib/getting-started/getting-started-step-model"

export function GettingStartedUnavailableView({
  body,
  description,
  title,
}: {
  body: string
  description: string
  title: string
}) {
  return (
    <WorkspacePageShell
      eyebrow="Setup"
      title="Getting started"
      description={description}
    >
      <WorkspaceEmptyState title={title} body={body} />
    </WorkspacePageShell>
  )
}

function stepHref(key: ReturnType<typeof getNextGettingStartedStep>) {
  return key ? getGettingStartedStepHref(key) : null
}

function ActiveStep({
  progress,
  props,
}: {
  progress: GettingStartedProgressInput
  props: GettingStartedPageViewProps
}) {
  const backHref = stepHref(
    getPreviousGettingStartedStep(props.activeStep, progress)
  )
  const nextHref =
    stepHref(getNextGettingStartedStep(props.activeStep, progress)) ??
    getGettingStartedStepHref("review-setup")

  switch (props.activeStep) {
    case "setup-mode":
      return (
        <SetupModeStep
          migrationSetup={props.migrationSetup}
          modeLocked={props.modeLocked}
          nextHref={nextHref}
          recommendationReason={props.recommendationReason}
          recommendedMigrationSetupMode={props.recommendedMigrationSetupMode}
          tenantStartDate={props.tenantStartDate}
        />
      )
    case "operation-profile":
      return (
        <OperationProfileSetupForm
          backHref={backHref}
          operationProfile={props.operationProfile}
          redirectTo={nextHref}
          tenantName={props.tenantName}
        />
      )
    case "shares-charges":
      return (
        <SharesChargesStep
          backHref={backHref}
          chargeDefinitions={props.chargeDefinitions}
          migrationSetup={props.migrationSetup}
          quickFillEnabled={props.quickFillEnabled}
          redirectTo={nextHref}
          sharePolicy={props.sharePolicy}
          shareStructureVersions={props.shareStructureVersions}
          tenantStartDate={props.tenantStartDate}
        />
      )
    case "profit":
      return (
        <ProfitSharingStep
          backHref={backHref}
          businessPolicy={props.businessPolicy}
          dividendPeriods={props.dividendPeriods}
          migrationSetup={props.migrationSetup}
          quickFillEnabled={props.quickFillEnabled}
          redirectTo={nextHref}
          shareBusinesses={props.shareBusinesses}
          tenantStartDate={props.tenantStartDate}
        />
      )
    case "profit-seasons":
      return (
        <ProfitSeasonsReviewStep
          backHref={backHref}
          businessProfitSeasons={props.businessProfitSeasons}
          migrationSetup={props.migrationSetup}
          quickFillEnabled={props.quickFillEnabled}
          redirectTo={nextHref}
        />
      )
    case "review-setup":
      return (
        <ReviewSetupStep
          backHref={backHref}
          businessPolicy={props.businessPolicy}
          chargeDefinitions={props.chargeDefinitions}
          completion={{
            operationProfile: isGettingStartedStepComplete(
              "operation-profile",
              progress
            ),
            profit:
              isGettingStartedStepComplete("profit", progress) &&
              isGettingStartedStepComplete("profit-seasons", progress),
            setupMode: isGettingStartedStepComplete("setup-mode", progress),
            sharesCharges: isGettingStartedStepComplete(
              "shares-charges",
              progress
            ),
          }}
          migrationSetupMode={props.migrationSetup.mode}
          operationProfile={props.operationProfile}
          shareBusinesses={props.shareBusinesses}
          sharePolicy={props.sharePolicy}
          tenantStartDate={props.tenantStartDate}
        />
      )
    case "admin-member":
    case "review":
      return (
        <OnePathStep
          aside={
            <p>
              Going live locks the opening records and starts normal daily work
              for staff and members.
            </p>
          }
          backHref={getGettingStartedStepHref("admin-member")}
          lede="Fix each item that is not ready, then go live."
          primary={<span />}
          stepKey="go-live"
          title="Go live"
        >
          <GoLiveChecklist
            checklist={props.goLiveChecklist}
            migrationSnapshot={props.migrationSnapshot}
            tenantHost={props.tenantHost}
            tenantName={props.tenantName}
          />
        </OnePathStep>
      )
  }
}

export function GettingStartedPageView(props: GettingStartedPageViewProps) {
  const progress: GettingStartedProgressInput = {
    businessPolicyId: props.businessPolicy.id,
    businessProfitSeasons: props.businessProfitSeasons,
    migrationSetup: props.migrationSetup,
    operationProfileReviewedAt: props.operationProfile.reviewedAt,
    sharePolicy: props.sharePolicy,
    snapshot: props.migrationSnapshot,
  }

  return (
    // The step card's heading is the page heading; the topbar names the page.
    <DashboardPageShell>
      <section className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)] max-md:[&_a]:min-h-11 max-md:[&_button]:min-h-11 max-md:[&_input]:min-h-11 max-md:[&_select]:min-h-11">
        <OnePathRail
          currentStepKey={getJourneyStepKey(props.activeStep)}
          steps={buildOnePathRailSteps({
            ...progress,
            activeStep: props.activeStep,
          })}
        />
        <div className="min-w-0">
          <ActiveStep progress={progress} props={props} />
        </div>
      </section>
    </DashboardPageShell>
  )
}
