import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import type { MemberLedgerBackfillRow } from "@halaalvest/backfill"
import type { InitialMigrationSnapshot } from "@halaalvest/domain"
import { Fragment, type ComponentProps, type ReactNode } from "react"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@halaalvest/ui/components/alert"
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
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@halaalvest/ui/components/field"
import { Input } from "@halaalvest/ui/components/input"
import { Separator } from "@halaalvest/ui/components/separator"
import { Textarea } from "@halaalvest/ui/components/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@halaalvest/ui/components/tooltip"
import { cn } from "@halaalvest/ui/lib/utils"
import { formatCurrency } from "@halaalvest/utils"
import type {
  TenantOperationProfileReadModel,
  TenantBusinessProfitPolicySettings,
  TenantMigrationSetupMode,
  TenantMigrationSetupSettings,
  TenantServiceAccessMode,
  TenantSharePolicySettings,
} from "@halaalvest/db"
import { BusinessProfitSeasonDeductionCells } from "@/components/business-profit-season-deduction-popover"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import {
  BusinessProfitPolicyForm,
  ChargeDefinitionForm,
  FinanceStartDateForm,
  ShareBusinessForm,
} from "@/components/forms/tenant-finance-forms"
import {
  GettingStartedFooterActionsSlot,
  GettingStartedFooterPortal,
} from "@/components/getting-started-footer-slot"
import {
  OperationProfileChoice,
  OperationProfileSubmitButton,
} from "@/components/operation-profile-wizard-controls"
import { GettingStartedShareModelPanel } from "@/components/share-model-workspace"
import { type GettingStartedStepKey } from "@/hooks/use-getting-started-params"
import {
  accessModesFromCommitmentCollectionChoice,
  firstOperationProfileStep,
  getOperationProfileStepIndex,
  getOperationProfileStepMeta,
  getOperationProfileStepNavigation,
  operationProfileStepHref,
  operationProfileStepKeys,
  type CommitmentCollectionChoice,
  type OperationProfileStepKey,
} from "@/lib/getting-started/operation-profile-flow"
import {
  finalizeInitialMigrationAction,
  saveBusinessProfitSeasonReviewAction,
  updateTenantOperationProfileAction,
  updateTenantMigrationSetupAction,
} from "@/lib/dashboard-actions"
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

const compactInputTableClassName =
  "w-full table-fixed border-separate border-spacing-x-2 border-spacing-y-2 border-0 [&_td]:border-0 [&_td]:p-0 [&_th]:border-0 [&_th]:p-0 [&_tr]:border-0"
const profitSeasonsReviewFormId = "profit-seasons-review-form"

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
  if (key === "business") return !missing.has("business_profit_pools")
  if (key === "profit-seasons") {
    return !missing.has("business_profit_seasons")
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

function getStepMeta(key: GettingStartedStepKey) {
  const meta = {
    "admin-member": {
      description:
        "Choose full historical backfill or a brought-forward opening position for the registered admin, then repeat it for every member.",
      label: "Member onboarding",
    },
    business: {
      description:
        "Optionally record business pools, profits, expenses, and the explicit no-history decision when there are none.",
      label: "Business and profits (optional)",
    },
    "profit-seasons": {
      description:
        "Review generated dividend seasons, confirm deductions, and prepare profit entries for member migration.",
      label: "Dividend sharing review",
    },
    charges: {
      description:
        "Set active cooperative charges and dated history before member backfill can be trusted.",
      label: "Charges and history",
    },
    review: {
      description:
        "Review every setup gate and finalize the one-time migration into live operations.",
      label: "Review and go live",
    },
    shares: {
      description:
        "Optionally define share capital history when it should affect member ledgers.",
      label: "Shares and history (optional)",
    },
    "profit-policy": {
      description:
        "Set the dividend or profit-sharing season used before member migration and future allocations.",
      label: "Profit-sharing season",
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

function ConfirmationForm({
  action,
  buttonLabel,
  confirmationLabel = "Confirmation phrase",
  description,
  disabled = false,
  id,
  includeNotes = true,
  placeholder,
  submitVariant = "outline",
  title,
}: {
  action: ComponentProps<"form">["action"]
  buttonLabel: string
  confirmationLabel?: string
  description: string
  disabled?: boolean
  id: string
  includeNotes?: boolean
  placeholder: string
  submitVariant?: ComponentProps<typeof Button>["variant"]
  title: string
}) {
  const confirmationId = `${id}-confirmation`
  const notesId = `${id}-notes`

  return (
    <form action={action} className="border border-border/70 bg-muted/20 p-4">
      <FieldSet>
        <FieldLegend>{title}</FieldLegend>
        <FieldDescription>{description}</FieldDescription>
        <FieldGroup className="gap-4">
          <Field data-disabled={disabled ? true : undefined}>
            <FieldLabel htmlFor={confirmationId}>
              {confirmationLabel}
            </FieldLabel>
            <Input
              disabled={disabled}
              id={confirmationId}
              name="confirmation"
              placeholder={placeholder}
            />
          </Field>
          {includeNotes ? (
            <Field>
              <FieldLabel htmlFor={notesId}>Review note</FieldLabel>
              <Textarea
                id={notesId}
                name="notes"
                placeholder="Optional review note"
              />
            </Field>
          ) : null}
          <Button
            className="w-fit"
            disabled={disabled}
            type="submit"
            variant={submitVariant}
          >
            {buttonLabel}
          </Button>
        </FieldGroup>
      </FieldSet>
    </form>
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
              const meta = getStepMeta(key)
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

const migrationSetupModeOptions = [
  {
    description:
      "Enter the cooperative's past records so member savings, shares, business profit seasons, and dividends can be reconstructed.",
    label: "Historical backfill",
    mode: "historical_backfill",
  },
  {
    description:
      "Enter the current cooperative and member positions, skip old records that have already landed, and continue operations from today.",
    label: "Brought forward",
    mode: "brought_forward",
  },
] satisfies Array<{
  description: string
  label: string
  mode: TenantMigrationSetupMode
}>

const operationProfileFormId = "getting-started-operation-profile-form"

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
        <form
          action={updateTenantMigrationSetupAction}
          className="grid gap-3 md:grid-cols-2"
        >
          {migrationSetupModeOptions.map((option) => {
            const selected = migrationSetup.mode === option.mode
            const recommended = recommendedMigrationSetupMode === option.mode

            return (
              <div
                className={cn(
                  "flex min-h-[210px] flex-col justify-between border p-4",
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border/70 bg-muted/20"
                )}
                key={option.mode}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={selected ? "default" : "secondary"}>
                      {selected ? "Selected" : "Option"}
                    </Badge>
                    {recommended ? (
                      <Badge variant="outline">Recommended</Badge>
                    ) : null}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{option.label}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {option.description}
                  </p>
                </div>
                <Button
                  className="mt-5 w-fit"
                  name="mode"
                  type="submit"
                  value={option.mode}
                  variant={selected ? "default" : "outline"}
                >
                  {selected ? "Keep selected" : `Use ${option.label}`}
                </Button>
              </div>
            )
          })}
        </form>
      </CardContent>
    </Card>
  )
}

function getCommitmentCollectionChoice(
  operationProfile: TenantOperationProfileReadModel
): CommitmentCollectionChoice {
  const membersUploadReceipts =
    operationProfile.services.payment_receipts.accessMode ===
    "member_self_service"
  const usesCollectionSources =
    operationProfile.services.collection_sources.accessMode !== "disabled"

  if (membersUploadReceipts && usesCollectionSources) return "mixed"
  if (usesCollectionSources) return "collection_sources"
  if (membersUploadReceipts) return "member_receipts"
  return "office"
}

function isServiceOffered(accessMode: TenantServiceAccessMode) {
  return accessMode !== "disabled" && accessMode !== "read_only"
}

function getRequestChannel(accessMode: TenantServiceAccessMode) {
  return accessMode === "member_self_service" ? "member" : "office"
}

function formatAccessMode(value: TenantServiceAccessMode) {
  const labels = {
    disabled: "Not offered",
    member_self_service: "Members can request",
    office_only: "Office-managed",
    read_only: "View existing records only",
  } satisfies Record<TenantServiceAccessMode, string>

  return labels[value]
}

function OperationProfileProgress({
  activeStep,
  reviewed,
}: {
  activeStep: OperationProfileStepKey
  reviewed: boolean
}) {
  const activeIndex = getOperationProfileStepIndex(activeStep)
  const activeMeta = getOperationProfileStepMeta(activeStep)
  const progressPercent =
    ((activeIndex + 1) / operationProfileStepKeys.length) * 100

  return (
    <div className="border-b border-border/70 bg-muted/20 px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Operation Profile
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
            {activeMeta.label}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            {activeMeta.description}
          </p>
        </div>
        <Badge variant={reviewed ? "default" : "secondary"}>
          {reviewed ? "Reviewed" : "Needs review"}
        </Badge>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden bg-background">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Step {activeIndex + 1} of {operationProfileStepKeys.length}
      </p>
    </div>
  )
}

function OperationProfilePolicyInputs({
  operationProfile,
  step,
}: {
  operationProfile: TenantOperationProfileReadModel
  step: OperationProfileStepKey
}) {
  const hideProcurementPolicy =
    step !== "procurement" ||
    !isServiceOffered(operationProfile.services.procurement.accessMode)
  const hideFoodPurchasePolicy =
    step !== "foodstuff" ||
    !isServiceOffered(operationProfile.services.food_purchase.accessMode)

  return (
    <>
      {hideProcurementPolicy ? (
        <input
          name="procurementMaximumActiveObligationsPerMember"
          type="hidden"
          value={
            operationProfile.policy.procurementMaximumActiveObligationsPerMember
          }
        />
      ) : null}
      {hideFoodPurchasePolicy ? (
        <>
          <input
            name="foodPurchaseMaximumActiveObligationsPerMember"
            type="hidden"
            value={
              operationProfile.policy
                .foodPurchaseMaximumActiveObligationsPerMember
            }
          />
          <input
            name="foodPurchaseRequiresOpenCycle"
            type="hidden"
            value={
              operationProfile.policy.foodPurchaseRequiresOpenCycle
                ? "true"
                : "false"
            }
          />
        </>
      ) : null}
    </>
  )
}

function IntroOperationProfileStep({ tenantName }: { tenantName: string }) {
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
      <div className="border border-border/70 bg-background p-5">
        <Badge variant="secondary">Let&apos;s know about your operation</Badge>
        <h3 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
          Tell us how {tenantName} works day to day.
        </h3>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          We will ask about commitment collection, procurement, Foodstuff
          Purchase, and member access one at a time. Your answers tailor the
          member portal and staff workspaces without changing existing finance
          safety rules.
        </p>
      </div>
      <div className="grid gap-3">
        {[
          "Short choices, not a long settings table.",
          "Services can stay office-managed when members should come in person.",
          "Existing obligations and records remain visible for audit and trust.",
        ].map((item) => (
          <div className="border border-border/70 bg-muted/20 p-4" key={item}>
            <CheckCircle2Icon className="size-4 text-primary" />
            <p className="mt-3 text-sm leading-6 font-medium text-foreground">
              {item}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function CommitmentCollectionStep({
  operationProfile,
}: {
  operationProfile: TenantOperationProfileReadModel
}) {
  const selectedChoice = getCommitmentCollectionChoice(operationProfile)

  return (
    <FieldSet>
      <FieldLegend>How are commitments collected?</FieldLegend>
      <FieldDescription>
        Choose the closest operating model. Manual payers remain valid even when
        payroll-style sources are enabled.
      </FieldDescription>
      <div className="grid gap-3 md:grid-cols-2">
        <OperationProfileChoice
          checked={selectedChoice === "office"}
          description="Officials post office payments, cash payments, transfers, and other evidence for members."
          name="commitmentCollection"
          title="Officials record payments"
          value="office"
        />
        <OperationProfileChoice
          checked={selectedChoice === "member_receipts"}
          description="Members upload receipts from their portal, then officials review and post them."
          name="commitmentCollection"
          title="Members submit receipts"
          value="member_receipts"
        />
        <OperationProfileChoice
          checked={selectedChoice === "collection_sources"}
          description="A ministry, employer, payroll group, or other Collection Source releases deductions in batches."
          name="commitmentCollection"
          title="Collection Source batches"
          value="collection_sources"
        />
        <OperationProfileChoice
          checked={selectedChoice === "mixed"}
          description="Some members pay through a source, while manual or self-employed members submit receipts or pay in-office."
          name="commitmentCollection"
          title="Mixed collection"
          value="mixed"
        />
      </div>
    </FieldSet>
  )
}

function ProcurementOperationStep({
  operationProfile,
}: {
  operationProfile: TenantOperationProfileReadModel
}) {
  const accessMode = operationProfile.services.procurement.accessMode
  const offered = isServiceOffered(accessMode)
  const channel = getRequestChannel(accessMode)

  return (
    <FieldSet>
      <FieldLegend>Does this cooperative offer procurement?</FieldLegend>
      <FieldDescription>
        Procurement helps members purchase goods or services and repay over
        time. If it is not offered, member and staff create actions stay closed.
      </FieldDescription>
      <div className="grid gap-3 md:grid-cols-2">
        <OperationProfileChoice
          checked={!offered}
          description={
            accessMode === "read_only"
              ? "New procurement is closed, but existing procurement records remain visible."
              : "Hide procurement request actions for this cooperative."
          }
          name="procurementOffered"
          title="No, not offered"
          value="no"
        />
        <OperationProfileChoice
          checked={offered}
          description="Enable procurement setup and choose whether members can start requests online."
          name="procurementOffered"
          title="Yes, procurement is offered"
          value="yes"
        />
      </div>
      {offered ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              Who starts requests?
            </h4>
            <div className="mt-3 grid gap-3">
              <OperationProfileChoice
                checked={channel === "office"}
                description="Members come to the office. Staff record and manage requests online."
                name="procurementRequestChannel"
                title="Office-managed"
                value="office"
              />
              <OperationProfileChoice
                checked={channel === "member"}
                description="Members can start procurement requests from their portal."
                name="procurementRequestChannel"
                title="Members can request online"
                value="member"
              />
            </div>
          </div>
          <Field>
            <FieldLabel htmlFor="procurementMaximumActiveObligationsPerMember">
              Active procurement limit per member
            </FieldLabel>
            <Input
              defaultValue={
                operationProfile.policy
                  .procurementMaximumActiveObligationsPerMember
              }
              id="procurementMaximumActiveObligationsPerMember"
              min={1}
              name="procurementMaximumActiveObligationsPerMember"
              type="number"
            />
            <FieldDescription>
              Use 1 when a member must finish one procurement before collecting
              another.
            </FieldDescription>
          </Field>
        </div>
      ) : null}
    </FieldSet>
  )
}

function FoodstuffOperationStep({
  operationProfile,
}: {
  operationProfile: TenantOperationProfileReadModel
}) {
  const accessMode = operationProfile.services.food_purchase.accessMode
  const offered = isServiceOffered(accessMode)
  const channel = getRequestChannel(accessMode)

  return (
    <FieldSet>
      <FieldLegend>Does this cooperative run Foodstuff Purchase?</FieldLegend>
      <FieldDescription>
        Foodstuff Purchase is a separate cycle-led service. Officials can open
        cycles and members apply only when the service is active.
      </FieldDescription>
      <div className="grid gap-3 md:grid-cols-2">
        <OperationProfileChoice
          checked={!offered}
          description={
            accessMode === "read_only"
              ? "New applications are closed, but existing Foodstuff Purchase records remain visible."
              : "Hide Foodstuff Purchase application actions for this cooperative."
          }
          name="foodPurchaseOffered"
          title="No, not offered"
          value="no"
        />
        <OperationProfileChoice
          checked={offered}
          description="Enable Foodstuff Purchase and choose how members join purchase cycles."
          name="foodPurchaseOffered"
          title="Yes, Foodstuff Purchase is offered"
          value="yes"
        />
      </div>
      {offered ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              Who starts applications?
            </h4>
            <div className="mt-3 grid gap-3">
              <OperationProfileChoice
                checked={channel === "office"}
                description="Members come to the office. Staff record applications during a cycle."
                name="foodPurchaseRequestChannel"
                title="Office-managed"
                value="office"
              />
              <OperationProfileChoice
                checked={channel === "member"}
                description="Members can apply from their portal when a cycle is open."
                name="foodPurchaseRequestChannel"
                title="Members can apply online"
                value="member"
              />
            </div>
          </div>
          <div className="grid gap-4">
            <Field>
              <FieldLabel htmlFor="foodPurchaseMaximumActiveObligationsPerMember">
                Active Foodstuff Purchase limit per member
              </FieldLabel>
              <Input
                defaultValue={
                  operationProfile.policy
                    .foodPurchaseMaximumActiveObligationsPerMember
                }
                id="foodPurchaseMaximumActiveObligationsPerMember"
                min={1}
                name="foodPurchaseMaximumActiveObligationsPerMember"
                type="number"
              />
            </Field>
            <label
              className="flex gap-3 border border-border/70 bg-muted/20 p-3 text-sm"
              htmlFor="foodPurchaseRequiresOpenCycle"
            >
              <input
                className="mt-1 size-4 shrink-0 accent-primary"
                defaultChecked={
                  operationProfile.policy.foodPurchaseRequiresOpenCycle
                }
                id="foodPurchaseRequiresOpenCycle"
                name="foodPurchaseRequiresOpenCycle"
                type="checkbox"
              />
              <span>
                <span className="block font-medium text-foreground">
                  Require an open cycle
                </span>
                <span className="mt-1 block text-muted-foreground">
                  Members can only apply when officials open an active purchase
                  cycle.
                </span>
              </span>
            </label>
          </div>
        </div>
      ) : null}
    </FieldSet>
  )
}

function MemberAccessOperationStep({
  operationProfile,
}: {
  operationProfile: TenantOperationProfileReadModel
}) {
  const supportMode = operationProfile.services.support_cases.accessMode
  const supportChannel = supportMode === "office_only" ? "office" : "member"

  return (
    <FieldSet>
      <FieldLegend>What can members do from their portal?</FieldLegend>
      <FieldDescription>
        Keep member support simple. Other service actions follow the choices you
        made in the earlier steps.
      </FieldDescription>
      <div className="grid gap-3 md:grid-cols-2">
        <OperationProfileChoice
          checked={supportChannel === "member"}
          description="Members can raise support cases and ask officials for help from the portal."
          name="supportAccess"
          title="Members can contact support online"
          value="member"
        />
        <OperationProfileChoice
          checked={supportChannel === "office"}
          description="Support is handled by officials in the office; members do not start cases online."
          name="supportAccess"
          title="Office-managed support"
          value="office"
        />
      </div>
    </FieldSet>
  )
}

function OperationProfileReviewStep({
  operationProfile,
}: {
  operationProfile: TenantOperationProfileReadModel
}) {
  const commitmentChoice = getCommitmentCollectionChoice(operationProfile)
  const commitmentModes =
    accessModesFromCommitmentCollectionChoice(commitmentChoice)
  const rows = [
    ["Commitment collection", commitmentChoice.replaceAll("_", " ")],
    ["Payment receipts", formatAccessMode(commitmentModes.paymentReceipts)],
    ["Collection Sources", formatAccessMode(commitmentModes.collectionSources)],
    [
      "Batch posting",
      formatAccessMode(commitmentModes.collectionSourceBatchPosting),
    ],
    [
      "Procurement",
      formatAccessMode(operationProfile.services.procurement.accessMode),
    ],
    [
      "Foodstuff Purchase",
      formatAccessMode(operationProfile.services.food_purchase.accessMode),
    ],
    [
      "Member support",
      formatAccessMode(operationProfile.services.support_cases.accessMode),
    ],
  ] satisfies Array<[string, string]>

  return (
    <div className="grid gap-4">
      <div className="border border-border/70 bg-muted/20 p-4">
        <h3 className="text-lg font-semibold tracking-tight text-foreground">
          Review operation profile
        </h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Save these choices to tailor staff workspaces, member actions, and
          reports without hiding existing records or obligations.
        </p>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {rows.map(([label, value]) => (
          <div
            className="border border-border/70 bg-background p-4"
            key={label}
          >
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm font-semibold text-foreground capitalize">
              {value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function OperationProfileStepContent({
  operationProfile,
  step,
  tenantName,
}: Pick<GettingStartedPageViewProps, "operationProfile" | "tenantName"> & {
  step: OperationProfileStepKey
}) {
  if (step === "intro") {
    return <IntroOperationProfileStep tenantName={tenantName} />
  }

  if (step === "commitments") {
    return <CommitmentCollectionStep operationProfile={operationProfile} />
  }

  if (step === "procurement") {
    return <ProcurementOperationStep operationProfile={operationProfile} />
  }

  if (step === "foodstuff") {
    return <FoodstuffOperationStep operationProfile={operationProfile} />
  }

  if (step === "member-access") {
    return <MemberAccessOperationStep operationProfile={operationProfile} />
  }

  return <OperationProfileReviewStep operationProfile={operationProfile} />
}

function OperationProfileStep({
  operationProfile,
  operationProfileStep,
  tenantName,
}: Pick<
  GettingStartedPageViewProps,
  "operationProfile" | "operationProfileStep" | "tenantName"
>) {
  const navigation = getOperationProfileStepNavigation(operationProfileStep)

  return (
    <div className="overflow-hidden border border-border/70 bg-background">
      <OperationProfileProgress
        activeStep={operationProfileStep}
        reviewed={Boolean(operationProfile.reviewedAt)}
      />
      <form
        action={updateTenantOperationProfileAction}
        className="grid gap-5 p-5"
        id={operationProfileFormId}
      >
        <input name="redirectTo" type="hidden" value={navigation.nextHref} />
        {operationProfileStep === "intro" ? null : (
          <input
            name="changeReason"
            type="hidden"
            value="Initial setup operation profile update."
          />
        )}
        <OperationProfilePolicyInputs
          operationProfile={operationProfile}
          step={operationProfileStep}
        />
        <div className="motion-safe:animate-in motion-safe:duration-300 motion-safe:fade-in-0 motion-safe:slide-in-from-right-2">
          <OperationProfileStepContent
            operationProfile={operationProfile}
            step={operationProfileStep}
            tenantName={tenantName}
          />
        </div>
        <GettingStartedFooterPortal>
          {operationProfileStep === "intro" ? (
            <Link className={buttonVariants({})} href={navigation.nextHref}>
              Next
            </Link>
          ) : (
            <OperationProfileSubmitButton
              formId={operationProfileFormId}
              label={
                operationProfileStep === "review" ? "Save and continue" : "Next"
              }
            />
          )}
        </GettingStartedFooterPortal>
      </form>
    </div>
  )
}

function StartDateStep({
  tenantStartDate,
}: Pick<GettingStartedPageViewProps, "tenantStartDate">) {
  return (
    <Card>
      <SetupCardHeader
        eyebrow="Step 2"
        title="Enter or confirm the cooperative start date"
        description="This date becomes the lower bound for historical finance setup and member migration rows."
      />
      <CardContent className="grid gap-5">
        <FinanceStartDateForm
          defaultStartDate={tenantStartDate}
          preserveDraftKey="getting-started:start-date"
        />
      </CardContent>
    </Card>
  )
}

function ChargesStep({
  chargeDefinitions,
  quickFillEnabled,
  tenantStartDate,
}: Pick<
  GettingStartedPageViewProps,
  "chargeDefinitions" | "quickFillEnabled" | "tenantStartDate"
>) {
  return (
    <Card>
      <SetupCardHeader
        eyebrow="Step 3"
        title="Cooperative charges and history"
        description="Create the charge definitions and dated amount changes that member migration will deduct."
      />
      <CardContent className="grid gap-5">
        <ChargeDefinitionForm
          devMode={quickFillEnabled}
          financeStartDate={tenantStartDate}
          initialDefinitions={chargeDefinitions}
          preserveDraftKey="getting-started:charges"
          redirectTo={stepHref("shares")}
          showSubmitButton={false}
        />
      </CardContent>
    </Card>
  )
}

function SharesStep({
  sharePolicy,
  shareStructureVersions,
  tenantStartDate,
}: Pick<
  GettingStartedPageViewProps,
  "sharePolicy" | "shareStructureVersions" | "tenantStartDate"
>) {
  return (
    <Card>
      <SetupCardHeader
        eyebrow="Step 4"
        title="Shares system"
        description="Choose the cooperative share model before member balances are brought forward."
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
  quickFillEnabled,
}: Pick<GettingStartedPageViewProps, "businessPolicy" | "quickFillEnabled">) {
  return (
    <Card>
      <SetupCardHeader
        eyebrow="Step 5"
        title="Profit-sharing season"
        description="Set the distribution calendar that migration and future profit allocations use."
      />
      <CardContent className="grid gap-5">
        <BusinessProfitPolicyForm
          defaultPolicy={businessPolicy}
          devMode={quickFillEnabled}
          preserveDraftKey="getting-started:profit-policy"
          redirectTo={stepHref("business")}
          showSubmitButton={false}
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
            ? "Enter only active businesses and profits that have not yet been shared. Already-shared historical profit should already be reflected in member balances."
            : "Capture every historical business profit pool before member backfill so dividend allocations can be reviewed with the ledger."
        }
      />
      <CardContent className="grid gap-5">
        <ShareBusinessForm
          dividendPeriods={dividendPeriods}
          financeStartDate={tenantStartDate}
          initialBusinesses={shareBusinesses}
          preserveDraftKey="getting-started:business-history"
          profitHistoryMode
          redirectTo={
            isBroughtForward
              ? stepHref("admin-member")
              : stepHref("profit-seasons")
          }
          setupMode={migrationSetup.mode}
          showSubmitButton={false}
          sourceType="backfill"
        />
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
          <form
            action={saveBusinessProfitSeasonReviewAction}
            className="grid gap-4"
            id={profitSeasonsReviewFormId}
          >
            <input
              name="redirectTo"
              type="hidden"
              value={stepHref("admin-member")}
            />
            {pendingCount > 0 ? (
              <Alert>
                <AlertTitle>{pendingCount} season(s) need review</AlertTitle>
                <AlertDescription>
                  Save this table to create dividend seasons and link each
                  business profit entry to the reviewed period.
                </AlertDescription>
              </Alert>
            ) : null}
            <div className="overflow-x-auto">
              <table className={`${compactInputTableClassName} min-w-[820px]`}>
                <colgroup>
                  <col className="w-[250px]" />
                  <col className="w-[110px]" />
                  <col className="w-[105px]" />
                  <col className="w-[120px]" />
                  <col className="w-[110px]" />
                  <col className="w-[92px]" />
                </colgroup>
                <thead>
                  <tr>
                    <th
                      className="text-left text-xs font-medium text-muted-foreground"
                      scope="col"
                    >
                      Season
                    </th>
                    <th
                      className="text-right text-xs font-medium text-muted-foreground"
                      scope="col"
                    >
                      Profit
                    </th>
                    <th
                      className="text-right text-xs font-medium text-muted-foreground"
                      scope="col"
                    >
                      Row deduct.
                    </th>
                    <th
                      className="text-right text-xs font-medium text-muted-foreground"
                      scope="col"
                    >
                      Season deduct.
                    </th>
                    <th
                      className="text-right text-xs font-medium text-muted-foreground"
                      scope="col"
                    >
                      Distributable
                    </th>
                    <th
                      className="text-left text-xs font-medium text-muted-foreground"
                      scope="col"
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {businessProfitSeasons.map((season) => {
                    const maxSeasonDeduction = Math.max(
                      0,
                      season.grossProfitAmount - season.entryDeductionAmount
                    )
                    const visibleBusinessNames = season.businessNames.slice(
                      0,
                      1
                    )
                    const hiddenBusinessCount =
                      season.businessNames.length - visibleBusinessNames.length

                    return (
                      <Fragment key={season.key}>
                        <tr aria-hidden="true">
                          <td colSpan={6}>
                            <div className="border-t border-border/70" />
                          </td>
                        </tr>
                        <tr className="align-top">
                          <td>
                            <input
                              name="seasonKey"
                              type="hidden"
                              value={season.key}
                            />
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <button
                                      className="text-left font-medium underline-offset-4 hover:underline"
                                      type="button"
                                    />
                                  }
                                >
                                  {season.label}
                                </TooltipTrigger>
                                <TooltipContent
                                  align="start"
                                  className="grid max-w-[460px] gap-2 rounded-sm border border-border bg-popover p-3 text-popover-foreground shadow-xl [&>*:last-child]:bg-popover [&>*:last-child]:fill-popover"
                                  side="right"
                                  sideOffset={12}
                                >
                                  <div className="border-b border-border/70 pb-2">
                                    <p className="text-sm font-semibold">
                                      Profit entries
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {season.label}
                                    </p>
                                  </div>
                                  <div className="grid gap-2">
                                    {season.profitEntries.map((entry) => (
                                      <div
                                        className="grid gap-1 border-b border-border/70 pb-2 last:border-b-0 last:pb-0"
                                        key={`${season.key}-${entry.businessName}-${entry.profitDate}`}
                                      >
                                        <div className="flex items-center justify-between gap-3">
                                          <span className="font-medium">
                                            {entry.businessName}
                                          </span>
                                          <span className="tabular-nums">
                                            {formatCurrency(entry.profitAmount)}
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 text-muted-foreground">
                                          <span>
                                            {formatDate(entry.profitDate)}
                                          </span>
                                          <span>
                                            deduction{" "}
                                            {formatCurrency(
                                              entry.deductionAmount
                                            )}
                                          </span>
                                        </div>
                                        {entry.reason ? (
                                          <p className="text-muted-foreground">
                                            {entry.reason}
                                          </p>
                                        ) : null}
                                      </div>
                                    ))}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {visibleBusinessNames.map((businessName) => (
                                <Badge
                                  key={`${season.key}-${businessName}`}
                                  variant="secondary"
                                >
                                  {businessName}
                                </Badge>
                              ))}
                              {hiddenBusinessCount > 0 ? (
                                <Badge variant="outline">
                                  +{hiddenBusinessCount}
                                </Badge>
                              ) : null}
                            </div>
                          </td>
                          <td className="pt-2 text-right text-sm">
                            {formatCurrency(season.grossProfitAmount)}
                          </td>
                          <td className="pt-2 text-right text-sm">
                            {formatCurrency(season.entryDeductionAmount)}
                          </td>
                          <BusinessProfitSeasonDeductionCells
                            initialAmount={season.deductionAmount}
                            initialReason={season.deductionReason}
                            maxAmount={maxSeasonDeduction}
                            preserveDraftKey={`getting-started:profit-seasons:${season.key}`}
                            seasonKey={season.key}
                          />
                          <td>
                            <Badge
                              variant={
                                season.status === "pending" ||
                                season.status === "draft"
                                  ? "secondary"
                                  : "default"
                              }
                            >
                              {season.status === "pending"
                                ? "Needs review"
                                : season.status}
                            </Badge>
                          </td>
                        </tr>
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <GettingStartedFooterPortal>
              <Button form={profitSeasonsReviewFormId} type="submit">
                Finalize
              </Button>
            </GettingStartedFooterPortal>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

function AdminMemberStep(props: GettingStartedPageViewProps) {
  const { adminMember, memberOptions, migrationSetup, tenantName } = props
  const isBroughtForward = migrationSetup.mode === "brought_forward"
  const backfillHref = adminMember
    ? `/members/${adminMember.id}/backfill?step=baseline`
    : "/settings/imports/members"
  const broughtForwardHref = adminMember
    ? getMemberMigrationStartHref(adminMember.id, "brought_forward")
    : "/settings/imports/members"
  const primaryMemberMigrationHref = adminMember
    ? getMemberMigrationStartHref(adminMember.id, migrationSetup.mode)
    : "/settings/imports/members"
  const onboardingSteps = [
    {
      body: "Confirm identity, joined date, member number, and whether the member starts from full history or a brought-forward position.",
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
            {adminMember ? "Start admin migration" : "Add members"}
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

        <div className="grid gap-3 md:grid-cols-2">
          <div className="border border-border/70 bg-background p-4">
            <Badge variant="outline">Faster start</Badge>
            <h3 className="mt-3 text-sm font-semibold">
              Brought-forward opening position
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Use current book balances for savings, shares, active financing,
              procurement, and special savings when reconstructing every month
              would slow adoption.
            </p>
            <Link
              className={cn(buttonVariants({ variant: "outline" }), "mt-4")}
              href={broughtForwardHref}
            >
              {adminMember ? "Start brought-forward" : "Add members first"}
            </Link>
          </div>
          <div className="border border-border/70 bg-background p-4">
            <Badge variant="outline">Detailed audit</Badge>
            <h3 className="mt-3 text-sm font-semibold">
              Full historical backfill
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Recreate dated commitments, charges, legacy loans, repayments,
              activity windows, and profit adjustments when the cooperative
              needs month-by-month history.
            </p>
            <Link
              className={cn(buttonVariants({ variant: "outline" }), "mt-4")}
              href={backfillHref}
            >
              {adminMember ? "Start full backfill" : "Add members first"}
            </Link>
          </div>
        </div>

        <div className="border border-border/70">
          <div className="border-b border-border/70 px-4 py-3">
            <p className="text-sm font-semibold">Onboard every member</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Continue either migration path for each member while normal live
              operations stay available after setup finalization.
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

        <ConfirmationForm
          action={finalizeInitialMigrationAction}
          buttonLabel="Complete setup"
          description="Type FINALIZE MIGRATION after every setup and member backfill step is complete. This updates the workspace setup gate, opens live operations, and locks historical setup."
          disabled={blockingSteps.length > 0}
          id="finalize-migration"
          includeNotes={false}
          placeholder="FINALIZE MIGRATION"
          submitVariant="default"
          title={`Finalize ${tenantName} migration`}
        />
      </CardContent>
    </Card>
  )
}

function ActiveStepPanel(props: GettingStartedPageViewProps) {
  const orderedStepKeys = getOrderedStepKeys(props)
  const activeIndex = orderedStepKeys.indexOf(props.activeStep)
  const operationProfileNavigation = getOperationProfileStepNavigation(
    props.operationProfileStep
  )
  const previousStep =
    props.activeStep === "admin-member"
      ? (orderedStepKeys.at(-1) ?? "business")
      : orderedStepKeys[activeIndex - 1]
  const nextStep =
    props.activeStep === "admin-member"
      ? undefined
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
        <OperationProfileStep
          operationProfile={props.operationProfile}
          operationProfileStep={props.operationProfileStep}
          tenantName={props.tenantName}
        />
      ) : props.activeStep === "start-date" ? (
        <StartDateStep tenantStartDate={props.tenantStartDate} />
      ) : props.activeStep === "charges" ? (
        <ChargesStep
          chargeDefinitions={props.chargeDefinitions}
          quickFillEnabled={props.quickFillEnabled}
          tenantStartDate={props.tenantStartDate}
        />
      ) : props.activeStep === "shares" ? (
        <SharesStep
          sharePolicy={props.sharePolicy}
          shareStructureVersions={props.shareStructureVersions}
          tenantStartDate={props.tenantStartDate}
        />
      ) : props.activeStep === "profit-policy" ? (
        <ProfitPolicyStep
          businessPolicy={props.businessPolicy}
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
        <AdminMemberStep {...props} />
      ) : (
        <ReviewStep
          migrationSnapshot={props.migrationSnapshot}
          tenantName={props.tenantName}
        />
      )}
      <StepFooter
        hasStepNextAction={hasStepNextAction}
        hideNext={props.activeStep === "admin-member"}
        nextHrefOverride={
          props.activeStep === "setup-mode"
            ? operationProfileStepHref(firstOperationProfileStep)
            : props.activeStep === "operation-profile"
              ? operationProfileNavigation.nextHref
              : undefined
        }
        nextStep={
          props.activeStep === "operation-profile" ? undefined : nextStep
        }
        previousHrefOverride={
          props.activeStep === "operation-profile"
            ? operationProfileNavigation.previousHref
            : undefined
        }
        previousStep={
          props.activeStep === "operation-profile" ? undefined : previousStep
        }
        requireHistoryConfirmation={requireHistoryConfirmation}
      />
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
    ) ?? "admin-member"

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
      description={`Choose how ${tenantName} will enter existing records, then complete the setup gates before normal workspace records open.`}
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
