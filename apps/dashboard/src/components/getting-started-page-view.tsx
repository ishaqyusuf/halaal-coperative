import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import type { MemberLedgerBackfillRow } from "@halaalvest/backfill"
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
  TenantBusinessProfitPolicySettings,
  TenantMigrationSetupMode,
  TenantMigrationSetupSettings,
  TenantOperationProfileReadModel,
  TenantSharePolicySettings,
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
  type OperationProfileStepKey,
} from "@/lib/getting-started/operation-profile-flow"
import { getMemberMigrationStartHref } from "@/lib/members/member-migration-routing"
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  HistoryIcon,
  UsersIcon,
} from "lucide-react"

type ChargeDefinitionRow = {
  appliesToLoanRequests?: boolean
  appliesToLoans?: boolean
  appliesToMembers?: boolean
  id: string
  chargeFrequency:
    | "recurring_monthly"
    | "per_contribution"
    | "one_time"
    | "manual"
  chargeValueType: "fixed_amount" | "percentage"
  code: string
  isActive: boolean
  isMonthlyLevy?: boolean
  kind: "fixed" | "percentage"
  name: string
  purpose?:
    | "general"
    | "member_share"
    | "loan_fee"
    | "membership_fee"
    | "penalty"
  versions: Array<{
    amount: number
    chargeValueType: "fixed_amount" | "percentage"
    effectiveFrom: string
    id: string
    notes?: string | null
    status: "current" | "historical" | "scheduled"
  }>
}

type ShareStructureVersionRow = {
  amount: number
  basis: "after_charge_deductions"
  effectiveFrom: string
  id: string
  notes?: string | null
  valueType: "fixed_amount" | "percentage"
}

type ShareBusinessRow = {
  capitalAmount: number
  endDate: string | null
  id: string
  linkedDividendPeriodId?: string | null
  name: string
  notes?: string | null
  profitAmount: number
  profitEntries: Array<{
    allocatableProfitAmount: number
    expenseAmount: number
    id: string
    linkedDividendPeriodId?: string | null
    profitAmount: number
    profitDate: string
    reason?: string | null
    sourceType: string
    status: string
  }>
  startDate: string
  status: string
}

type DividendPeriodRow = {
  id: string
  label: string
}

type BusinessProfitSeasonRow = {
  businessNames: string[]
  deductionAmount: number
  deductionReason?: string | null
  distributableAmount: number
  entryDeductionAmount: number
  grossProfitAmount: number
  id?: string | null
  key: string
  label: string
  periodEnd: string
  periodStart: string
  profitEntries: Array<{
    businessName: string
    deductionAmount: number
    profitAmount: number
    profitDate: string
    reason?: string | null
    status: string
  }>
  profitEntryCount: number
  status: "pending" | "draft" | "approved" | "published" | "closed"
}

type MemberOption = {
  id: string
  label: string
}

type MemberSummary = {
  email?: string | null
  fullName: string
  id: string
  joinedAt: string
  memberNumber: string
}

type LegacyLoanDraftRow = {
  closedAt: string | null
  guarantorOneMemberId?: string | null
  guarantorTwoMemberId?: string | null
  id: string
  loanLabel: string
  memberId: string
  memberName: string
  memberNumber: string
  openedAt: string
  outstandingPrincipalBalance: number
  principalAmount: number
  savingsDuringLoan: number
  scheduledMonthlyPrincipalRepayment: number
}

type MemberAmountLogRow = {
  amount: number
  effectiveFrom: string
  id: string
  notes?: string | null
}

type MemberActivityEventRow = {
  effectiveMonth: string
  id: string
  notes?: string | null
  reason?: string | null
  status: "active" | "inactive"
}

type MigrationMemberReviewRow = {
  appliedBackfillBatches: number
  appliedBackfillMonths: number
  backfillDraftBatches: number
  fullName: string
  id: string
  joinedAt: string
  legacyLoanDrafts: number
  memberNumber: string
  profitAdjustments: number
  rowAdjustments: number
  status: "profile_only" | "configured" | "backfill_draft" | "backfill_applied"
}

type ProfitMigrationOptionRow = {
  allocatableProfitAmount: number
  availableAmount: number
  businessName: string
  editableAvailableAmount: number
  expenseAmount: number
  id: string
  memberAllocatedAmount: number
  memberMigrationAdjustmentAmount: number
  memberPublishedAllocationAmount: number
  profitAmount: number
  profitDate: string
  seasonLabel?: string | null
  seasonPeriodEnd?: string | null
  totalDisbursedAmount: number
}

type GettingStartedPageViewProps = {
  activeStep: GettingStartedStepKey
  adminMember: MemberSummary | null
  businessPolicy: TenantBusinessProfitPolicySettings
  businessProfitSeasons: BusinessProfitSeasonRow[]
  chargeDefinitions: ChargeDefinitionRow[]
  dividendPeriods: DividendPeriodRow[]
  generatedLedgerError?: string | null
  generatedLedgerRows?: MemberLedgerBackfillRow[]
  legacyLoanDrafts: LegacyLoanDraftRow[]
  memberActivityEvents: MemberActivityEventRow[]
  memberAmountLogs: MemberAmountLogRow[]
  memberNumberPrefix?: string | null
  memberOptions: MemberOption[]
  migrationMemberReview: MigrationMemberReviewRow[]
  migrationSnapshot: InitialMigrationSnapshot
  migrationSetup: TenantMigrationSetupSettings
  operationProfile: TenantOperationProfileReadModel
  operationProfileStep: OperationProfileStepKey
  profitMigrationOptions: ProfitMigrationOptionRow[]
  quickFillEnabled: boolean
  recommendedMigrationSetupMode: TenantMigrationSetupMode | null
  selectedMigrationMemberId?: string | null
  selectedMigrationMemberLabel?: string | null
  shareBusinesses: ShareBusinessRow[]
  sharePolicy: TenantSharePolicySettings
  shareStructureVersions: ShareStructureVersionRow[]
  tenantName: string
  tenantStartDate: string | null
}

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

const setupStepKeys: GettingStartedStepKey[] = [
  "setup-mode",
  "operation-profile",
  "start-date",
  "charges",
  "shares",
  "profit-policy",
  "business",
  "profit-seasons",
]

function shouldShowProfitSeasonsSetup(props: {
  businessProfitSeasons: BusinessProfitSeasonRow[]
  migrationSetup: TenantMigrationSetupSettings
  migrationSnapshot: InitialMigrationSnapshot
}) {
  if (props.migrationSetup.mode === "brought_forward") {
    const today = new Date().toISOString().slice(0, 10)

    return props.businessProfitSeasons.some(
      (season) =>
        season.periodEnd < today &&
        season.profitEntries.some((entry) => entry.status === "pending")
    )
  }

  return (
    props.migrationSetup.mode === "historical_backfill" ||
    props.migrationSnapshot.missingStepKeys.includes("business_profit_seasons")
  )
}

function getOrderedStepKeys(
  props: Pick<
    GettingStartedPageViewProps,
    "businessProfitSeasons" | "migrationSetup" | "migrationSnapshot"
  >
) {
  return setupStepKeys.filter(
    (key) => key !== "profit-seasons" || shouldShowProfitSeasonsSetup(props)
  )
}

function getStepGroups(
  props: Pick<
    GettingStartedPageViewProps,
    "businessProfitSeasons" | "migrationSetup" | "migrationSnapshot"
  >
) {
  const orderedStepKeys = getOrderedStepKeys(props)

  return [
    {
      label: "Foundation",
      steps: orderedStepKeys.filter((key) =>
        ["setup-mode", "operation-profile", "start-date"].includes(key)
      ),
    },
    {
      label:
        props.migrationSetup.mode === "brought_forward"
          ? "Current finance setup"
          : "Financial history",
      steps: orderedStepKeys.filter(
        (key) =>
          !["setup-mode", "operation-profile", "start-date"].includes(key)
      ),
    },
  ] satisfies Array<{ label: string; steps: GettingStartedStepKey[] }>
}

function isStepComplete(
  key: GettingStartedStepKey,
  snapshot: InitialMigrationSnapshot,
  migrationSetup?: TenantMigrationSetupSettings,
  operationProfile?: TenantOperationProfileReadModel
) {
  const missing = new Set(snapshot.missingStepKeys)

  if (key === "start-date") return !missing.has("finance_start_date")
  if (key === "setup-mode") return Boolean(migrationSetup?.id)
  if (key === "operation-profile") {
    return Boolean(operationProfile?.reviewedAt)
  }
  if (key === "charges") return !missing.has("charge_schedules")
  if (key === "shares") return true
  if (key === "profit-policy") return true
  if (key === "business") {
    return (
      migrationSetup?.mode === "brought_forward" ||
      !missing.has("business_profit_pools")
    )
  }
  if (key === "profit-seasons") {
    return (
      migrationSetup?.mode === "brought_forward" ||
      !missing.has("business_profit_seasons")
    )
  }
  if (key === "admin-member") {
    return (
      !missing.has("member_profiles") &&
      !missing.has("legacy_loans") &&
      !missing.has("member_ledger_backfill")
    )
  }

  return !missing.has("finalization")
}

function getStepMeta(
  key: GettingStartedStepKey,
  migrationMode: TenantMigrationSetupMode
) {
  const isBroughtForward = migrationMode === "brought_forward"
  const meta = {
    "admin-member": {
      description: isBroughtForward
        ? "Capture the current opening position for the registered admin, then repeat it for every member."
        : "Complete historical backfill for the registered admin, then repeat it for every member.",
      label: isBroughtForward ? "Member opening positions" : "Member onboarding",
    },
    business: {
      description: isBroughtForward
        ? "Record businesses participating in the current profit-sharing season."
        : "Record historical business pools, profits, and expenses.",
      label: isBroughtForward
        ? "Current-season businesses"
        : "Business and profits",
    },
    "profit-seasons": {
      description:
        "Review generated dividend seasons, confirm deductions, and prepare profit entries for member migration.",
      label: "Dividend sharing review",
    },
    charges: {
      description: isBroughtForward
        ? "Set the active charges members will pay from the opening date onward."
        : "Set cooperative charges and their dated history for member backfill.",
      label: isBroughtForward ? "Current charges" : "Charges and history",
    },
    review: {
      description:
        "Review every setup gate and finalize the one-time migration into live operations.",
      label: "Review and go live",
    },
    shares: {
      description: isBroughtForward
        ? "Set the cooperative's current share model and active terms."
        : "Define share capital history when it should affect member ledgers.",
      label: isBroughtForward ? "Current share model" : "Shares and history",
    },
    "profit-policy": {
      description: isBroughtForward
        ? "Set the rules for the current and future profit-sharing seasons."
        : "Set the dividend season used by historical and future allocations.",
      label: isBroughtForward
        ? "Current profit-sharing policy"
        : "Profit-sharing season",
    },
    "start-date": {
      description:
        "Anchor historical finance so every charge, share, loan, and contribution is dated against the same start month.",
      label: "Cooperative start date",
    },
    "setup-mode": {
      description:
        "Choose whether this cooperative will rebuild history or carry current balances forward.",
      label: "Setup mode",
    },
    "operation-profile": {
      description:
        "Confirm how members request commitments, receipts, procurement, Foodstuff Purchase, support, and payroll collections.",
      label: "Operation profile",
    },
  } satisfies Record<
    GettingStartedStepKey,
    { description: string; label: string }
  >

  return meta[key]
}

function formatDate(value: string | null) {
  if (!value) return "Not set"

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00.000Z`))
}

function stepHref(key: GettingStartedStepKey) {
  if (key === "operation-profile") {
    return operationProfileStepHref(firstOperationProfileStep)
  }

  if (key === "admin-member") {
    return "/onboarding-success"
  }

  return `?step=${key}`
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
  businessProfitSeasons: BusinessProfitSeasonRow[]
  migrationSetup: TenantMigrationSetupSettings
  operationProfile: TenantOperationProfileReadModel
  snapshot: InitialMigrationSnapshot
}) {
  const stepGroups = getStepGroups({
    businessProfitSeasons,
    migrationSetup,
    migrationSnapshot: snapshot,
  })
  const orderedStepKeys = getOrderedStepKeys({
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
              const meta = getStepMeta(key, migrationSetup.mode)
              const complete = isStepComplete(
                key,
                snapshot,
                migrationSetup,
                operationProfile
              )
              const isActive = activeStep === key
              const stepNumber = orderedStepKeys.indexOf(key) + 1

              return (
                <Link
                  key={key}
                  className={cn(
                    "border px-3 py-3 text-left transition-colors",
                    isActive
                      ? "border-foreground bg-primary text-primary-foreground"
                      : "border-border/70 bg-muted/20 hover:bg-muted/40"
                  )}
                  href={stepHref(key)}
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
  const nextHref = nextHrefOverride ?? (nextStep ? stepHref(nextStep) : "")
  const previousHref =
    previousHrefOverride ?? (previousStep ? stepHref(previousStep) : "")
  const hasNext = Boolean(nextHref) && !hideNext

  return (
    <div className="mt-6 flex flex-col gap-4">
      <Separator />
      <div className="flex flex-wrap justify-between gap-2">
        {previousHref ? (
          <Link
            className={buttonVariants({ variant: "outline" })}
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
              <AlertDialogTrigger render={<Button />}>
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
            <Link className={buttonVariants({})} href={nextHref}>
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
  | "migrationSetup"
  | "recommendedMigrationSetupMode"
  | "tenantName"
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
          redirectTo={stepHref("shares")}
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
          profitPolicyHref={stepHref("profit-policy")}
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
          redirectTo={stepHref("business")}
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
              ? stepHref("admin-member")
              : stepHref("profit-seasons")
          }
          setupMode={migrationSetup.mode}
          shareBusinesses={shareBusinesses}
        />
        {isBroughtForward && shareBusinesses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No ongoing businesses or unshared profits to bring forward?{" "}
            <Link
              className="font-medium text-foreground underline underline-offset-4"
              href={stepHref("admin-member")}
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
            redirectTo={stepHref("admin-member")}
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
      <div className="border-b border-border/70 bg-primary/5 px-6 py-6">
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
            className={buttonVariants({})}
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
      <CardContent className="grid gap-6 p-6">
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
                    <span>Joined {formatDate(adminMember.joinedAt)}</span>
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
                  className={buttonVariants({})}
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
            className={cn(buttonVariants({ variant: "outline" }), "mt-4")}
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
  const orderedStepKeys = getOrderedStepKeys(props)
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
  const orderedStepKeys = getOrderedStepKeys(props)
  const firstIncompleteStep =
    orderedStepKeys.find(
      (key) =>
        !isStepComplete(
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
          className={buttonVariants({ variant: "outline" })}
          href={stepHref(firstIncompleteStep)}
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
          "grid gap-5",
          props.activeStep === "operation-profile"
            ? "xl:grid-cols-1"
            : "xl:grid-cols-[280px_minmax(0,1fr)]"
        )}
      >
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
