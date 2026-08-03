import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import type { InitialMigrationSnapshot } from "@halaalvest/domain"
import type { ReactNode } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@halaalvest/ui/components/alert-dialog"
import { Badge } from "@halaalvest/ui/components/badge"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@halaalvest/ui/components/card"
import { Separator } from "@halaalvest/ui/components/separator"
import { cn } from "@halaalvest/ui/lib/utils"
import type {
  TenantMigrationSetupSettings,
  TenantOperationProfileReadModel,
} from "@halaalvest/db"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import {
  FinalizeMigrationContent,
  GettingStartedBusinessHistoryContent,
  GettingStartedChargesContent,
  GettingStartedProfitPolicyContent,
  GettingStartedStartDateContent,
  MigrationSetupModeContent,
  OperationProfileGettingStartedContent,
  ProfitSeasonsReviewContent,
} from "@/components/getting-started-content"
import { GettingStartedFooterActionsSlot } from "@/components/getting-started-footer-slot"
import { GettingStartedShareModelPanel } from "@/components/share-model-workspace"
import { type GettingStartedStepKey } from "@/hooks/use-getting-started-params"
import {
  firstOperationProfileStep,
  operationProfileStepHref,
} from "@/lib/getting-started/operation-profile-flow"
import type {
  GettingStartedBusinessProfitSeasonRow,
  GettingStartedPageViewProps,
} from "@/lib/getting-started/getting-started-page-types"
import {
  formatGettingStartedDate,
  getGettingStartedStepGroups,
  getGettingStartedStepHref,
  getGettingStartedStepMeta,
  getOrderedGettingStartedStepKeys,
  isGettingStartedStepComplete,
} from "@/lib/getting-started/getting-started-step-model"
import { getMemberMigrationStartHref } from "@/lib/members/member-migration-routing"
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  HistoryIcon,
  UsersIcon,
} from "lucide-react"

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
      eyebrow="Initial migration"
      title="Getting started"
      description={description}
    >
      <WorkspaceEmptyState title={title} body={body} />
    </WorkspacePageShell>
  )
}

function SetupCardHeader({
  action,
  description,
  eyebrow,
  title,
}: {
  action?: ReactNode
  description: string
  eyebrow: string
  title: string
}) {
  return (
    <CardHeader>
      <div className="flex flex-col gap-2">
        <Badge className="w-fit" variant="secondary">
          {eyebrow}
        </Badge>
        <div className="flex flex-col gap-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </div>
      {action ? <CardAction>{action}</CardAction> : null}
    </CardHeader>
  )
}

function MetricBlock({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="border border-border/70 bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  )
}

function StepRail({
  activeStep,
  businessProfitSeasons,
  migrationSetup,
  operationProfile,
  snapshot,
}: {
  activeStep: GettingStartedStepKey
  businessProfitSeasons: GettingStartedBusinessProfitSeasonRow[]
  migrationSetup: TenantMigrationSetupSettings
  operationProfile: TenantOperationProfileReadModel
  snapshot: InitialMigrationSnapshot
}) {
  const stepGroups = getGettingStartedStepGroups({
    businessProfitSeasons,
    migrationSetup,
    migrationSnapshot: snapshot,
  })
  const orderedStepKeys = getOrderedGettingStartedStepKeys({
    businessProfitSeasons,
    migrationSetup,
    migrationSnapshot: snapshot,
  })

  return (
    <Card className="hidden xl:sticky xl:top-24 xl:flex xl:self-start">
      <SetupCardHeader
        eyebrow="Migration path"
        title="Setup sequence"
        description="Complete these in order before live workspace actions unlock."
      />
      <CardContent className="flex flex-col gap-5">
        {stepGroups.map((group) => (
          <div className="flex flex-col gap-2" key={group.label}>
            <p className="text-[11px] font-semibold text-muted-foreground">
              {group.label}
            </p>
            {group.steps.map((key) => {
              const meta = getGettingStartedStepMeta(key, migrationSetup.mode)
              const complete = isGettingStartedStepComplete(
                key,
                snapshot,
                migrationSetup,
                operationProfile
              )
              const isActive = activeStep === key
              const stepNumber = orderedStepKeys.indexOf(key) + 1

              return (
                <Link
                  aria-current={isActive ? "step" : undefined}
                  key={key}
                  className={cn(
                    "border px-3 py-3 text-left transition-colors",
                    isActive
                      ? "border-foreground bg-primary text-primary-foreground"
                      : "border-border/70 bg-muted/20 hover:bg-muted/40"
                  )}
                  href={getGettingStartedStepHref(key)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium">
                      Step {stepNumber}
                    </span>
                    <Badge
                      variant={isActive || !complete ? "secondary" : "default"}
                    >
                      {complete ? "Done" : "Todo"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm font-semibold">{meta.label}</p>
                </Link>
              )
            })}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function MobileStepNavigation({
  activeStep,
  businessProfitSeasons,
  migrationSetup,
  operationProfile,
  snapshot,
}: {
  activeStep: GettingStartedStepKey
  businessProfitSeasons: GettingStartedBusinessProfitSeasonRow[]
  migrationSetup: TenantMigrationSetupSettings
  operationProfile: TenantOperationProfileReadModel
  snapshot: InitialMigrationSnapshot
}) {
  const orderedStepKeys = getOrderedGettingStartedStepKeys({
    businessProfitSeasons,
    migrationSetup,
    migrationSnapshot: snapshot,
  })

  return (
    <nav aria-label="Migration setup steps" className="xl:hidden">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {orderedStepKeys.map((key, index) => {
          const meta = getGettingStartedStepMeta(key, migrationSetup.mode)
          const complete = isGettingStartedStepComplete(
            key,
            snapshot,
            migrationSetup,
            operationProfile
          )
          const isActive = activeStep === key

          return (
            <Link
              aria-current={isActive ? "step" : undefined}
              className={cn(
                "min-h-11 min-w-[160px] shrink-0 border px-3 py-2.5 transition-colors",
                isActive
                  ? "border-foreground bg-primary text-primary-foreground"
                  : "border-border/70 bg-muted/20 hover:bg-muted/40"
              )}
              href={getGettingStartedStepHref(key)}
              key={key}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium">Step {index + 1}</span>
                <Badge
                  variant={isActive || !complete ? "secondary" : "default"}
                >
                  {complete ? "Done" : "Todo"}
                </Badge>
              </div>
              <p className="mt-1.5 text-sm font-semibold">{meta.label}</p>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

function StepFooter({
  hasStepNextAction = false,
  hideNext = false,
  nextHrefOverride,
  nextLabel = "Next",
  nextStep,
  previousHrefOverride,
  previousStep,
  requireHistoryConfirmation = false,
}: {
  hasStepNextAction?: boolean
  hideNext?: boolean
  nextHrefOverride?: string
  nextLabel?: string
  nextStep?: GettingStartedStepKey
  previousHrefOverride?: string
  previousStep?: GettingStartedStepKey
  requireHistoryConfirmation?: boolean
}) {
  const nextHref =
    nextHrefOverride ?? (nextStep ? getGettingStartedStepHref(nextStep) : "")
  const previousHref =
    previousHrefOverride ??
    (previousStep ? getGettingStartedStepHref(previousStep) : "")
  const hasNext = Boolean(nextHref) && !hideNext

  return (
    <div className="mt-6 flex flex-col gap-4">
      <Separator />
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-between">
        {previousHref ? (
          <Link
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-11 w-full sm:h-10 sm:w-auto"
            )}
            href={previousHref}
          >
            Previous
          </Link>
        ) : (
          <span />
        )}
        {hasNext ? (
          hasStepNextAction ? (
            <GettingStartedFooterActionsSlot />
          ) : requireHistoryConfirmation ? (
            <AlertDialog>
              <AlertDialogTrigger
                render={<Button className="h-11 w-full sm:h-10 sm:w-auto" />}
              >
                {nextLabel}
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Continue without historical records?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Historical records are important for proper system
                    calculations. This step has no saved records yet. Are you
                    sure you want to proceed?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Review step</AlertDialogCancel>
                  <AlertDialogAction render={<Link href={nextHref} />}>
                    Proceed anyway
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Link
              className={cn(
                buttonVariants({}),
                "h-11 w-full sm:h-10 sm:w-auto"
              )}
              href={nextHref}
            >
              {nextLabel}
            </Link>
          )
        ) : null}
      </div>
    </div>
  )
}

function MigrationSetupModeStep({
  migrationSetup,
  recommendedMigrationSetupMode,
  tenantName,
}: Pick<
  GettingStartedPageViewProps,
  "migrationSetup" | "recommendedMigrationSetupMode" | "tenantName"
>) {
  return (
    <Card>
      <SetupCardHeader
        eyebrow="Step 1"
        title="Choose the setup mode"
        description={`Decide how ${tenantName} will enter its existing cooperative records before the rest of setup begins.`}
      />
      <CardContent>
        <MigrationSetupModeContent
          migrationSetup={migrationSetup}
          recommendedMigrationSetupMode={recommendedMigrationSetupMode}
        />
      </CardContent>
    </Card>
  )
}

function StartDateStep({
  migrationSetup,
  tenantStartDate,
}: Pick<GettingStartedPageViewProps, "migrationSetup" | "tenantStartDate">) {
  const isBroughtForward = migrationSetup.mode === "brought_forward"

  return (
    <Card>
      <SetupCardHeader
        eyebrow="Step 2"
        title="Enter or confirm the cooperative start date"
        description={
          isBroughtForward
            ? "Confirm when the cooperative began. Current opening balances and obligations will be captured separately as of the brought-forward date."
            : "This date becomes the lower bound for historical finance setup and member migration rows."
        }
      />
      <CardContent className="grid gap-5">
        <GettingStartedStartDateContent tenantStartDate={tenantStartDate} />
      </CardContent>
    </Card>
  )
}

function ChargesStep({
  chargeDefinitions,
  migrationSetup,
  quickFillEnabled,
  tenantStartDate,
}: Pick<
  GettingStartedPageViewProps,
  | "chargeDefinitions"
  | "migrationSetup"
  | "quickFillEnabled"
  | "tenantStartDate"
>) {
  const isBroughtForward = migrationSetup.mode === "brought_forward"

  return (
    <Card>
      <SetupCardHeader
        eyebrow="Step 3"
        title={
          isBroughtForward
            ? "Current cooperative charges"
            : "Cooperative charges and history"
        }
        description={
          isBroughtForward
            ? "Enter the active charges and current amounts members will pay from the brought-forward opening date onward. You do not need to recreate old charge changes."
            : "Create the charge definitions and dated amount changes that member migration will deduct."
        }
      />
      <CardContent className="grid gap-5">
        <GettingStartedChargesContent
          chargeDefinitions={chargeDefinitions}
          quickFillEnabled={quickFillEnabled}
          redirectTo={getGettingStartedStepHref("shares")}
          tenantStartDate={tenantStartDate}
        />
      </CardContent>
    </Card>
  )
}

function SharesStep({
  migrationSetup,
  sharePolicy,
  shareStructureVersions,
  tenantStartDate,
}: Pick<
  GettingStartedPageViewProps,
  | "migrationSetup"
  | "sharePolicy"
  | "shareStructureVersions"
  | "tenantStartDate"
>) {
  const isBroughtForward = migrationSetup.mode === "brought_forward"

  return (
    <Card>
      <SetupCardHeader
        eyebrow="Step 4"
        title="Shares system"
        description={
          isBroughtForward
            ? "Choose the current share model and enter the terms that apply from the brought-forward opening date. Existing member share balances are captured later as opening positions."
            : "Choose the cooperative share model and enter its dated history before member backfill."
        }
      />
      <CardContent className="grid gap-5">
        <GettingStartedShareModelPanel
          profitPolicyHref={getGettingStartedStepHref("profit-policy")}
          sharePolicy={sharePolicy}
          shareStructureVersions={shareStructureVersions}
          tenantStartDate={tenantStartDate}
        />
      </CardContent>
    </Card>
  )
}

function ProfitPolicyStep({
  businessPolicy,
  migrationSetup,
  quickFillEnabled,
}: Pick<
  GettingStartedPageViewProps,
  "businessPolicy" | "migrationSetup" | "quickFillEnabled"
>) {
  const isBroughtForward = migrationSetup.mode === "brought_forward"

  return (
    <Card>
      <SetupCardHeader
        eyebrow="Step 5"
        title="Profit-sharing season"
        description={
          isBroughtForward
            ? "Set the distribution calendar and allocation rules for the current profit-sharing season and future seasons."
            : "Set the distribution calendar that historical migration and future profit allocations use."
        }
      />
      <CardContent className="grid gap-5">
        <GettingStartedProfitPolicyContent
          businessPolicy={businessPolicy}
          quickFillEnabled={quickFillEnabled}
          redirectTo={getGettingStartedStepHref("business")}
        />
      </CardContent>
    </Card>
  )
}

function BusinessStep({
  dividendPeriods,
  migrationSetup,
  shareBusinesses,
  tenantStartDate,
}: Pick<
  GettingStartedPageViewProps,
  "dividendPeriods" | "migrationSetup" | "shareBusinesses" | "tenantStartDate"
>) {
  const isBroughtForward = migrationSetup.mode === "brought_forward"

  return (
    <Card>
      <SetupCardHeader
        eyebrow="Step 6"
        title={
          isBroughtForward
            ? "Ongoing businesses and unshared profits"
            : "Businesses, profits and history"
        }
        description={
          isBroughtForward
            ? "Enter the businesses participating in the current profit-sharing season. Capture their current capital and any profit earned in this season so it can be reviewed and shared in the future; do not recreate older completed seasons."
            : "Capture every historical business profit pool before member backfill so dividend allocations can be reviewed with the ledger."
        }
      />
      <CardContent className="grid gap-5">
        <GettingStartedBusinessHistoryContent
          dividendPeriods={dividendPeriods}
          financeStartDate={tenantStartDate}
          redirectTo={
            isBroughtForward
              ? getGettingStartedStepHref("admin-member")
              : getGettingStartedStepHref("profit-seasons")
          }
          setupMode={migrationSetup.mode}
          shareBusinesses={shareBusinesses}
        />
        {isBroughtForward && shareBusinesses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No ongoing businesses or unshared profits to bring forward?{" "}
            <Link
              className="font-medium text-foreground underline underline-offset-4"
              href={getGettingStartedStepHref("admin-member")}
            >
              Continue without businesses
            </Link>
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function ProfitSeasonsStep({
  businessProfitSeasons,
  migrationSetup,
  migrationSnapshot,
  tenantName,
}: Pick<
  GettingStartedPageViewProps,
  | "businessProfitSeasons"
  | "migrationSetup"
  | "migrationSnapshot"
  | "tenantName"
>) {
  const isBroughtForward = migrationSetup.mode === "brought_forward"
  const pendingCount = businessProfitSeasons.filter(
    (season) => season.status === "pending" || season.status === "draft"
  ).length

  if (migrationSnapshot.canUseLiveFinancialWrites) {
    return (
      <ReviewStep
        migrationSnapshot={migrationSnapshot}
        tenantName={tenantName}
      />
    )
  }

  return (
    <Card>
      <SetupCardHeader
        eyebrow="Step 7"
        title={
          isBroughtForward
            ? "Old pending dividend sharing"
            : "Dividend sharing seasons"
        }
        description={
          isBroughtForward
            ? "Review only past pending profits that have not yet been divided into member dividends."
            : "Review the generated profit-sharing seasons before member migration consumes business profit entries."
        }
      />
      <CardContent className="grid gap-5">
        {businessProfitSeasons.length === 0 ? (
          <WorkspaceEmptyState
            title="No dividend seasons to review."
            body={
              isBroughtForward
                ? "Brought-forward setup can continue when no old pending profits need sharing."
                : "Record business profit history first, or confirm no historical business profits in the previous step."
            }
          />
        ) : (
          <ProfitSeasonsReviewContent
            businessProfitSeasons={businessProfitSeasons}
            pendingCount={pendingCount}
            redirectTo={getGettingStartedStepHref("admin-member")}
          />
        )}
      </CardContent>
    </Card>
  )
}

function AdminMemberHandoffCard(
  props: Pick<
    GettingStartedPageViewProps,
    "adminMember" | "memberOptions" | "migrationSetup" | "tenantName"
  >
) {
  const { adminMember, memberOptions, migrationSetup, tenantName } = props
  const isBroughtForward = migrationSetup.mode === "brought_forward"
  const primaryMemberMigrationHref = adminMember
    ? getMemberMigrationStartHref(adminMember.id, migrationSetup.mode)
    : "/settings/imports/members"
  const onboardingSteps = [
    {
      body: isBroughtForward
        ? "Confirm identity, joined date, and member number before recording the member's brought-forward opening position."
        : "Confirm identity, joined date, and member number before rebuilding the member's historical records.",
      icon: ClipboardListIcon,
      label: "Confirm profile",
    },
    {
      body: isBroughtForward
        ? "Capture current savings, special savings, shares, and any active loan, procurement, or Food Purchase obligations."
        : "Capture detailed savings commitments, legacy loans, activity windows, repayments, and profit adjustments for the historical period.",
      icon: HistoryIcon,
      label: isBroughtForward ? "Capture current state" : "Capture history",
    },
    {
      body: "Review generated ledger rows after the chosen migration details are entered, then apply the approved member migration record.",
      icon: CheckCircle2Icon,
      label: "Apply migration",
    },
  ]

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border/70 bg-primary/5 px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center border border-primary/25 bg-background text-primary">
              <CheckCircle2Icon className="size-5" />
            </div>
            <div className="min-w-0">
              <Badge className="w-fit" variant="secondary">
                Setup complete
              </Badge>
              <CardTitle className="mt-3 text-2xl">
                Member onboarding is ready
              </CardTitle>
              <CardDescription className="mt-2 max-w-2xl text-sm">
                {`${tenantName}'s setup is finalized.`} The next workflow is to
                onboard each member through{" "}
                {isBroughtForward
                  ? "a brought-forward current position"
                  : "full historical backfill"}
                , starting with the registered admin.
              </CardDescription>
            </div>
          </div>
          <Link
            className={cn(buttonVariants({}), "h-11 w-full lg:h-10 lg:w-auto")}
            href={primaryMemberMigrationHref}
          >
            {adminMember
              ? isBroughtForward
                ? "Start admin setup"
                : "Start admin backfill"
              : "Add admin member"}
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>
      </div>
      <CardContent className="grid gap-6 p-4 sm:p-6">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]">
          <div className="border border-border/70 bg-muted/15 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <UsersIcon className="size-4 text-muted-foreground" />
                  <p className="text-xs font-medium text-muted-foreground">
                    First member workflow
                  </p>
                </div>
                <h3 className="mt-2 text-lg font-semibold">
                  {adminMember
                    ? adminMember.fullName
                    : "Create the admin member profile"}
                </h3>
                {adminMember ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>{adminMember.memberNumber}</span>
                    <span>
                      Joined {formatGettingStartedDate(adminMember.joinedAt)}
                    </span>
                    {adminMember.email ? (
                      <span>{adminMember.email}</span>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    The registered admin user must also exist as a member before
                    backfill onboarding can start.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {adminMember ? <Badge>Admin account</Badge> : null}
                <Link
                  className={cn(
                    buttonVariants({}),
                    "h-11 w-full sm:h-10 sm:w-auto"
                  )}
                  href={primaryMemberMigrationHref}
                >
                  {adminMember
                    ? isBroughtForward
                      ? "Begin brought-forward"
                      : "Begin backfill"
                    : "Add or import members"}
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
            <MetricBlock label="Setup status" value="Finalized" />
            <MetricBlock
              label="Members ready"
              value={memberOptions.length.toString()}
            />
          </div>
        </div>

        <div className="border border-border/70 bg-background p-4">
          <Badge variant="outline">
            {isBroughtForward ? "Selected setup mode" : "Detailed audit"}
          </Badge>
          <h3 className="mt-3 text-sm font-semibold">
            {isBroughtForward
              ? "Brought-forward opening position"
              : "Full historical backfill"}
          </h3>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {isBroughtForward
              ? "Capture current book balances for savings, shares, active financing, procurement, Foodstuff Purchase, and special savings. Historical month-by-month backfill is not part of this setup path."
              : "Recreate dated commitments, charges, legacy loans, repayments, activity windows, and profit adjustments for the cooperative's historical period."}
          </p>
          <Link
            className={cn(
              buttonVariants({ variant: "outline" }),
              "mt-4 h-11 w-full sm:h-10 sm:w-auto"
            )}
            href={primaryMemberMigrationHref}
          >
            {adminMember
              ? isBroughtForward
                ? "Start brought-forward"
                : "Start full backfill"
              : "Add members first"}
          </Link>
        </div>

        <div className="border border-border/70">
          <div className="border-b border-border/70 px-4 py-3">
            <p className="text-sm font-semibold">Onboard every member</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Continue the selected{" "}
              {isBroughtForward
                ? "brought-forward opening-position"
                : "historical-backfill"}{" "}
              workflow for each member.
            </p>
          </div>
          <div className="grid divide-y divide-border/70 md:grid-cols-3 md:divide-x md:divide-y-0">
            {onboardingSteps.map((step, index) => {
              const Icon = step.icon

              return (
                <div className="p-4" key={step.label}>
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center border border-border bg-background">
                      <Icon className="size-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </p>
                      <p className="text-sm font-semibold">{step.label}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function OnboardingSuccessView(
  props: Pick<
    GettingStartedPageViewProps,
    "adminMember" | "memberOptions" | "migrationSetup" | "tenantName"
  >
) {
  const isBroughtForward = props.migrationSetup.mode === "brought_forward"

  return (
    <WorkspacePageShell
      eyebrow="Onboarding successful"
      title="You’re all set"
      description={`${props.tenantName}'s cooperative setup is complete. ${
        isBroughtForward
          ? "Start by bringing the admin's current position forward."
          : "Start by rebuilding the admin's historical records."
      }`}
    >
      <AdminMemberHandoffCard {...props} />
    </WorkspacePageShell>
  )
}

function ReviewStep({
  migrationSnapshot,
  tenantName,
}: Pick<GettingStartedPageViewProps, "migrationSnapshot" | "tenantName">) {
  const blockingSteps = migrationSnapshot.missingStepKeys.filter(
    (key) => key !== "finalization"
  )

  if (migrationSnapshot.canUseLiveFinancialWrites) {
    return (
      <Card>
        <SetupCardHeader
          action={<Badge>Complete</Badge>}
          eyebrow="Migration complete"
          title="Live operations are unlocked"
          description={`${tenantName} can now use the normal dashboard workflows for members, monthly records, loans, contributions, and corrections.`}
        />
        <CardContent className="grid gap-4 md:grid-cols-3">
          <MetricBlock label="Migration status" value="Live operations" />
          <MetricBlock label="Historical inputs" value="Locked" />
          <MetricBlock label="Next workspace" value="Dashboard" />
        </CardContent>
        <CardFooter>
          <Link className={buttonVariants({})} href="/">
            Open dashboard
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <SetupCardHeader
        eyebrow="Final step"
        title="Review and unlock live operations"
        description="Finalization locks historical migration inputs and moves the cooperative into normal live workflows."
        action={
          <Badge variant={blockingSteps.length > 0 ? "secondary" : "default"}>
            {blockingSteps.length > 0 ? "Blocked" : "Ready"}
          </Badge>
        }
      />
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2">
          {migrationSnapshot.steps.map((step) => (
            <div
              className="border border-border/70 bg-muted/20 p-3"
              key={step.key}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">{step.label}</p>
                <Badge variant={step.complete ? "default" : "secondary"}>
                  {step.complete ? "Done" : "Missing"}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        <FinalizeMigrationContent
          blockingStepCount={blockingSteps.length}
          tenantName={tenantName}
        />
      </CardContent>
    </Card>
  )
}

function ActiveStepPanel(props: GettingStartedPageViewProps) {
  const orderedStepKeys = getOrderedGettingStartedStepKeys(props)
  const activeIndex = orderedStepKeys.indexOf(props.activeStep)
  const previousStep =
    props.activeStep === "admin-member"
      ? (orderedStepKeys.at(-1) ?? "business")
      : orderedStepKeys[activeIndex - 1]
  const nextStep =
    props.activeStep === "admin-member"
      ? undefined
      : props.activeStep === "business" &&
          props.migrationSetup.mode === "brought_forward"
        ? "admin-member"
        : props.activeStep === "profit-seasons"
          ? "admin-member"
          : orderedStepKeys[activeIndex + 1]
  const requireHistoryConfirmation =
    props.activeStep === "charges" && props.chargeDefinitions.length === 0
  const hasStepNextAction =
    props.activeStep === "operation-profile" ||
    ["charges", "shares", "profit-policy", "business"].includes(
      props.activeStep
    ) ||
    (props.activeStep === "profit-seasons" &&
      props.businessProfitSeasons.length > 0)

  return (
    <div>
      {props.activeStep === "setup-mode" ? (
        <MigrationSetupModeStep
          migrationSetup={props.migrationSetup}
          recommendedMigrationSetupMode={props.recommendedMigrationSetupMode}
          tenantName={props.tenantName}
        />
      ) : props.activeStep === "operation-profile" ? (
        <OperationProfileGettingStartedContent
          operationProfile={props.operationProfile}
          operationProfileStep={props.operationProfileStep}
          tenantName={props.tenantName}
        />
      ) : props.activeStep === "start-date" ? (
        <StartDateStep
          migrationSetup={props.migrationSetup}
          tenantStartDate={props.tenantStartDate}
        />
      ) : props.activeStep === "charges" ? (
        <ChargesStep
          chargeDefinitions={props.chargeDefinitions}
          migrationSetup={props.migrationSetup}
          quickFillEnabled={props.quickFillEnabled}
          tenantStartDate={props.tenantStartDate}
        />
      ) : props.activeStep === "shares" ? (
        <SharesStep
          migrationSetup={props.migrationSetup}
          sharePolicy={props.sharePolicy}
          shareStructureVersions={props.shareStructureVersions}
          tenantStartDate={props.tenantStartDate}
        />
      ) : props.activeStep === "profit-policy" ? (
        <ProfitPolicyStep
          businessPolicy={props.businessPolicy}
          migrationSetup={props.migrationSetup}
          quickFillEnabled={props.quickFillEnabled}
        />
      ) : props.activeStep === "business" ? (
        <BusinessStep
          dividendPeriods={props.dividendPeriods}
          migrationSetup={props.migrationSetup}
          shareBusinesses={props.shareBusinesses}
          tenantStartDate={props.tenantStartDate}
        />
      ) : props.activeStep === "profit-seasons" ? (
        <ProfitSeasonsStep
          businessProfitSeasons={props.businessProfitSeasons}
          migrationSetup={props.migrationSetup}
          migrationSnapshot={props.migrationSnapshot}
          tenantName={props.tenantName}
        />
      ) : props.activeStep === "admin-member" ? (
        <AdminMemberHandoffCard {...props} />
      ) : (
        <ReviewStep
          migrationSnapshot={props.migrationSnapshot}
          tenantName={props.tenantName}
        />
      )}
      {props.activeStep === "operation-profile" ? null : (
        <StepFooter
          hasStepNextAction={hasStepNextAction}
          hideNext={props.activeStep === "admin-member"}
          nextHrefOverride={
            props.activeStep === "setup-mode"
              ? operationProfileStepHref(firstOperationProfileStep)
              : undefined
          }
          nextStep={nextStep}
          previousStep={previousStep}
          requireHistoryConfirmation={requireHistoryConfirmation}
        />
      )}
    </div>
  )
}

export function GettingStartedPageView(props: GettingStartedPageViewProps) {
  const { migrationSnapshot, tenantName } = props
  const orderedStepKeys = getOrderedGettingStartedStepKeys(props)
  const firstIncompleteStep =
    orderedStepKeys.find(
      (key) =>
        !isGettingStartedStepComplete(
          key,
          migrationSnapshot,
          props.migrationSetup,
          props.operationProfile
        )
    ) ??
    (migrationSnapshot.missingStepKeys.includes("finalization") ||
    migrationSnapshot.canUseLiveFinancialWrites
      ? "review"
      : "admin-member")

  return (
    <WorkspacePageShell
      actions={
        <Link
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-11 w-full md:h-10 md:w-auto"
          )}
          href={getGettingStartedStepHref(firstIncompleteStep)}
        >
          Resume next step
        </Link>
      }
      eyebrow="Initial migration"
      title="Getting started"
      description={
        props.migrationSetup.mode === "brought_forward"
          ? `Set ${tenantName}'s current policies, active obligations, ongoing businesses, and opening member positions before normal workspace records open.`
          : `Rebuild ${tenantName}'s historical records, then complete the setup gates before normal workspace records open.`
      }
    >
      <section
        className={cn(
          "grid gap-5 max-md:[&_a]:min-h-11 max-md:[&_button]:min-h-11 max-md:[&_input]:min-h-11 max-md:[&_select]:min-h-11",
          props.activeStep === "operation-profile"
            ? "xl:grid-cols-1"
            : "xl:grid-cols-[280px_minmax(0,1fr)]"
        )}
      >
        {props.activeStep === "operation-profile" ? null : (
          <MobileStepNavigation
            activeStep={props.activeStep}
            businessProfitSeasons={props.businessProfitSeasons}
            migrationSetup={props.migrationSetup}
            operationProfile={props.operationProfile}
            snapshot={migrationSnapshot}
          />
        )}
        {props.activeStep === "operation-profile" ? null : (
          <StepRail
            activeStep={props.activeStep}
            businessProfitSeasons={props.businessProfitSeasons}
            migrationSetup={props.migrationSetup}
            operationProfile={props.operationProfile}
            snapshot={migrationSnapshot}
          />
        )}
        <ActiveStepPanel {...props} />
      </section>
    </WorkspacePageShell>
  )
}
