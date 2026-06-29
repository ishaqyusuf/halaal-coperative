import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import type { MemberLedgerBackfillRow } from "@halaalvest/backfill"
import type { InitialMigrationSnapshot } from "@halaalvest/domain"
import type { ComponentProps, ReactNode } from "react"
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
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@halaalvest/ui/components/progress"
import { Separator } from "@halaalvest/ui/components/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@halaalvest/ui/components/table"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { cn } from "@halaalvest/ui/lib/utils"
import { formatCurrency } from "@halaalvest/utils"
import {
  WorkspaceEmptyState,
  WorkspacePageShell,
} from "@/components/dashboard"
import {
  ChargeDefinitionForm,
  ChargeDefinitionVersionForm,
  FinanceStartDateForm,
  ShareBusinessForm,
  ShareStructureVersionForm,
} from "@/components/forms/tenant-finance-forms"
import { InitialMigrationPreview } from "@/components/initial-migration-preview"
import {
  finalizeInitialMigrationAction,
  markBusinessProfitPoolsReviewedAction,
} from "@/lib/dashboard-actions"

type GettingStartedStepKey =
  | "start-date"
  | "charges"
  | "shares"
  | "business"
  | "admin-member"
  | "review"

type ChargeDefinitionRow = {
  id: string
  chargeFrequency:
    | "recurring_monthly"
    | "per_contribution"
    | "one_time"
    | "manual"
  chargeValueType: "fixed_amount" | "percentage"
  code: string
  isActive: boolean
  kind: string
  name: string
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
  name: string
  notes?: string | null
  profitAmount: number
  profitEntries: Array<{
    allocatableProfitAmount: number
    expenseAmount: number
    id: string
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
  totalDisbursedAmount: number
}

type GettingStartedPageViewProps = {
  activeStep: GettingStartedStepKey
  adminMember: MemberSummary | null
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
  profitMigrationOptions: ProfitMigrationOptionRow[]
  selectedMigrationMemberId?: string | null
  selectedMigrationMemberLabel?: string | null
  shareBusinesses: ShareBusinessRow[]
  shareStructureVersions: ShareStructureVersionRow[]
  tenantName: string
  tenantStartDate: string | null
}

const orderedStepKeys: GettingStartedStepKey[] = [
  "start-date",
  "charges",
  "shares",
  "business",
  "admin-member",
  "review",
]

const stepGroups = [
  {
    label: "Foundation",
    steps: ["start-date"],
  },
  {
    label: "Financial history",
    steps: ["charges", "shares", "business"],
  },
  {
    label: "Member migration",
    steps: ["admin-member"],
  },
  {
    label: "Go live",
    steps: ["review"],
  },
] satisfies Array<{ label: string; steps: GettingStartedStepKey[] }>

function isStepComplete(
  key: GettingStartedStepKey,
  snapshot: InitialMigrationSnapshot,
) {
  const missing = new Set(snapshot.missingStepKeys)

  if (key === "start-date") return !missing.has("finance_start_date")
  if (key === "charges") return !missing.has("charge_schedules")
  if (key === "shares") return !missing.has("share_capital_plan")
  if (key === "business") return true
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
        "Migrate the registered admin as the first member with commitments, loans, activity windows, and generated ledger rows.",
      label: "Admin member migration",
    },
    business: {
      description:
        "Optionally record business pools, profits, expenses, and the explicit no-history decision when there are none.",
      label: "Business and profits (optional)",
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
        "Define the share capital system and every effective-date change that affects member ledgers.",
      label: "Shares and history",
    },
    "start-date": {
      description:
        "Anchor historical finance so every charge, share, loan, and contribution is dated against the same start month.",
      label: "Cooperative start date",
    },
  } satisfies Record<GettingStartedStepKey, { description: string; label: string }>

  return meta[key]
}

function formatDate(value: string | null) {
  if (!value) return "Not set"

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00.000Z`))
}

function stepHref(key: GettingStartedStepKey) {
  return `/getting-started?step=${key}`
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

function MetricBlock({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
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
    <form
      action={action}
      className="border border-border/70 bg-muted/20 p-4"
    >
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
  snapshot,
}: {
  activeStep: GettingStartedStepKey
  snapshot: InitialMigrationSnapshot
}) {
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
              const complete = isStepComplete(key, snapshot)
              const isActive = activeStep === key
              const stepNumber = orderedStepKeys.indexOf(key) + 1

              return (
                <Link
                  key={key}
                  className={cn(
                    "border px-3 py-3 text-left transition-colors",
                    isActive
                      ? "border-foreground bg-primary text-primary-foreground"
                      : "border-border/70 bg-muted/20 hover:bg-muted/40",
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

function SummaryCard({
  chargeDefinitions,
  migrationSnapshot,
  shareBusinesses,
  shareStructureVersions,
  tenantStartDate,
}: Pick<
  GettingStartedPageViewProps,
  | "chargeDefinitions"
  | "migrationSnapshot"
  | "shareBusinesses"
  | "shareStructureVersions"
  | "tenantStartDate"
>) {
  const completionPercent = Math.round(
    (migrationSnapshot.completedStepCount / migrationSnapshot.totalStepCount) *
      100,
  )
  const totalBusinessCapital = shareBusinesses.reduce(
    (sum, business) => sum + business.capitalAmount,
    0,
  )

  return (
    <Card className="lg:sticky lg:top-24 lg:self-start">
      <SetupCardHeader
        eyebrow="Live summary"
        title={`${completionPercent}% ready`}
        description="Saved data updates this command center after each step."
      />
      <CardContent className="grid gap-3">
        <Progress value={completionPercent}>
          <ProgressLabel>Migration readiness</ProgressLabel>
          <ProgressValue>{completionPercent}%</ProgressValue>
        </Progress>
        <MetricBlock
          label="Start date"
          value={formatDate(tenantStartDate)}
        />
        <MetricBlock
          label="Charges"
          value={`${chargeDefinitions.length} definitions`}
        />
        <MetricBlock
          label="Share rules"
          value={`${shareStructureVersions.length} versions`}
        />
        <MetricBlock
          label="Business capital"
          value={formatCurrency(totalBusinessCapital)}
        />
      </CardContent>
    </Card>
  )
}

function StepFooter({
  nextHrefOverride,
  nextLabel = "Next",
  nextStep,
  previousStep,
  requireHistoryConfirmation = false,
}: {
  nextHrefOverride?: string
  nextLabel?: string
  nextStep?: GettingStartedStepKey
  previousStep?: GettingStartedStepKey
  requireHistoryConfirmation?: boolean
}) {
  const nextHref = nextHrefOverride ?? (nextStep ? stepHref(nextStep) : "")
  const hasNext = Boolean(nextHref)

  return (
    <div className="mt-6 flex flex-col gap-4">
      <Separator />
      <div className="flex flex-wrap justify-between gap-2">
        {previousStep ? (
          <Link
            className={buttonVariants({ variant: "outline" })}
            href={stepHref(previousStep)}
          >
            Previous
          </Link>
        ) : (
          <span />
        )}
        {hasNext ? (
          requireHistoryConfirmation ? (
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

function HistoryTable({
  rows,
  title,
}: {
  rows: Array<{ amount: number; date: string; detail: string; id: string }>
  title: string
}) {
  return (
    <div className="border border-border/70">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{title}</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length > 0 ? (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.detail}</TableCell>
                <TableCell>{row.date}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(row.amount)}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell className="text-muted-foreground">
                Nothing saved yet.
              </TableCell>
              <TableCell>-</TableCell>
              <TableCell className="text-right">-</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function StartDateStep({
  tenantStartDate,
}: Pick<GettingStartedPageViewProps, "tenantStartDate">) {
  return (
    <Card>
      <SetupCardHeader
        eyebrow="Step 1"
        title="Enter or confirm the cooperative start date"
        description="This date becomes the lower bound for historical finance setup and member migration rows."
      />
      <CardContent className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <FinanceStartDateForm defaultStartDate={tenantStartDate} />
        <div className="border border-border/70 bg-muted/20 p-4">
          <p className="text-xs text-muted-foreground">Current anchor</p>
          <p className="mt-2 text-sm font-semibold">
            {formatDate(tenantStartDate)}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Every charge, share, profit, commitment, and legacy loan date should
            be on or after this date.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function ChargesStep({
  chargeDefinitions,
  tenantStartDate,
}: Pick<GettingStartedPageViewProps, "chargeDefinitions" | "tenantStartDate">) {
  return (
    <Card>
      <SetupCardHeader
        eyebrow="Step 2"
        title="Cooperative charges and history"
        description="Create the charge definitions and dated amount changes that member migration will deduct."
        action={
          <Link
            className={buttonVariants({ size: "sm", variant: "outline" })}
            href="/settings/imports/charges"
          >
            Import charge history
          </Link>
        }
      />
      <CardContent className="grid gap-5">
        <ChargeDefinitionForm
          financeStartDate={tenantStartDate}
          stayOnStepHref={stepHref("charges")}
        />
        {chargeDefinitions.length > 0 ? (
          <ChargeDefinitionVersionForm
            chargeDefinitions={chargeDefinitions.map((charge) => ({
              id: charge.id,
              kind: charge.kind,
              label: `${charge.name} (${charge.code})`,
            }))}
            financeStartDate={tenantStartDate}
            stayOnStepHref={stepHref("charges")}
          />
        ) : null}
        <HistoryTable
          title="Charge"
          rows={chargeDefinitions.flatMap((charge) =>
            charge.versions.map((version) => ({
              amount: version.amount,
              date: version.effectiveFrom,
              detail: `${charge.name} ${version.status}`,
              id: version.id,
            })),
          )}
        />
      </CardContent>
    </Card>
  )
}

function SharesStep({
  shareStructureVersions,
  tenantStartDate,
}: Pick<
  GettingStartedPageViewProps,
  "shareStructureVersions" | "tenantStartDate"
>) {
  return (
    <Card>
      <SetupCardHeader
        eyebrow="Step 3"
        title="Shares system and history"
        description="Define how share capital is calculated and preserve every historical effective-date change."
      />
      <CardContent className="grid gap-5">
        <ShareStructureVersionForm
          financeStartDate={tenantStartDate}
          stayOnStepHref={stepHref("shares")}
        />
        <HistoryTable
          title="Share rule"
          rows={shareStructureVersions.map((version) => ({
            amount: version.amount,
            date: version.effectiveFrom,
            detail:
              version.valueType === "percentage"
                ? "Percentage after charges"
                : "Fixed share amount",
            id: version.id,
          }))}
        />
      </CardContent>
    </Card>
  )
}

function BusinessStep({
  dividendPeriods,
  shareBusinesses,
  tenantStartDate,
}: Pick<
  GettingStartedPageViewProps,
  "dividendPeriods" | "shareBusinesses" | "tenantStartDate"
>) {
  return (
    <Card>
      <SetupCardHeader
        eyebrow="Step 4"
        title="Businesses, profits and history"
        description="Capture profit pools before member backfill so dividend allocations can be reviewed with the ledger."
      />
      <CardContent className="grid gap-5">
        <ShareBusinessForm
          dividendPeriods={dividendPeriods}
          financeStartDate={tenantStartDate}
          profitHistoryMode
          stayOnStepHref={stepHref("business")}
        />
        {shareBusinesses.length === 0 ? (
          <Alert>
            <AlertTitle>No business pool recorded yet</AlertTitle>
            <AlertDescription>
              Add a historical business pool, or explicitly confirm there are no
              business profits to migrate.
            </AlertDescription>
          </Alert>
        ) : null}
        <ConfirmationForm
          action={markBusinessProfitPoolsReviewedAction}
          buttonLabel="Save no-profit review"
          description="Type NO BUSINESS PROFITS only if this cooperative has no business profit history to allocate."
          id="business-profit-review"
          placeholder="NO BUSINESS PROFITS"
          title="Confirm no historical business profits"
        />
        <HistoryTable
          title="Business profit"
          rows={shareBusinesses.flatMap((business) =>
            business.profitEntries.map((entry) => ({
              amount: entry.allocatableProfitAmount,
              date: entry.profitDate,
              detail: `${business.name} · gross ${formatCurrency(
                entry.profitAmount
              )} · deduction ${formatCurrency(entry.expenseAmount)}`,
              id: entry.id,
            }))
          )}
        />
      </CardContent>
    </Card>
  )
}

function AdminMemberStep(props: GettingStartedPageViewProps) {
  const {
    adminMember,
    generatedLedgerError,
    generatedLedgerRows,
    legacyLoanDrafts,
    memberActivityEvents,
    memberAmountLogs,
    memberNumberPrefix,
    memberOptions,
    migrationMemberReview,
    migrationSnapshot,
    selectedMigrationMemberId,
    selectedMigrationMemberLabel,
  } = props

  return (
    <Card>
      <SetupCardHeader
        eyebrow="Step 5"
        title="First member migration"
        description="Use the registered admin as the first migrated member, then save commitment history, loan history, activity windows, and profit adjustments."
        action={
          <Link
            className={buttonVariants({ size: "sm", variant: "outline" })}
            href="/settings/imports/members"
          >
            Add or import members
          </Link>
        }
      />
      <CardContent className="grid gap-5">
        {adminMember ? (
          <div className="border border-border/70 bg-muted/20 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  Registered admin member
                </p>
                <h3 className="mt-1 text-lg font-semibold">
                  {adminMember.fullName}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {adminMember.memberNumber} · Joined{" "}
                  {formatDate(adminMember.joinedAt)}
                </p>
              </div>
              <Badge>{adminMember.email ?? "Admin account"}</Badge>
            </div>
          </div>
        ) : (
          <WorkspaceEmptyState
            title="Create the admin member profile first."
            body="The registered admin user must also exist as a member before commitment and loan migration can be reviewed."
          />
        )}

        <InitialMigrationPreview
          generatedLedgerError={generatedLedgerError}
          generatedLedgerRows={generatedLedgerRows}
          legacyLoanDrafts={legacyLoanDrafts}
          memberActivityEvents={memberActivityEvents}
          memberAmountLogs={memberAmountLogs}
          memberOptions={memberOptions}
          memberNumberPrefix={memberNumberPrefix}
          migrationMemberReview={migrationMemberReview}
          migrationSnapshot={migrationSnapshot}
          profitMigrationOptions={props.profitMigrationOptions}
          selectedMigrationMemberId={selectedMigrationMemberId}
          selectedMigrationMemberLabel={selectedMigrationMemberLabel}
          section="member-preview"
        />
      </CardContent>
    </Card>
  )
}

function ReviewStep({
  migrationSnapshot,
  tenantName,
}: Pick<GettingStartedPageViewProps, "migrationSnapshot" | "tenantName">) {
  const blockingSteps = migrationSnapshot.missingStepKeys.filter(
    (key) => key !== "finalization",
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
          description="Type FINALIZE MIGRATION after every setup and member backfill step is complete. This updates the tenant setup gate, opens live operations, and locks historical setup."
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
  const activeIndex = orderedStepKeys.indexOf(props.activeStep)
  const previousStep = orderedStepKeys[activeIndex - 1]
  const nextStep = orderedStepKeys[activeIndex + 1]
  const requireHistoryConfirmation =
    (props.activeStep === "charges" && props.chargeDefinitions.length === 0) ||
    (props.activeStep === "shares" &&
      props.shareStructureVersions.length === 0) ||
    (props.activeStep === "business" &&
      props.shareBusinesses.every(
        (business) => business.profitEntries.length === 0
      ))

  return (
    <div>
      {props.activeStep === "start-date" ? (
        <StartDateStep tenantStartDate={props.tenantStartDate} />
      ) : props.activeStep === "charges" ? (
        <ChargesStep
          chargeDefinitions={props.chargeDefinitions}
          tenantStartDate={props.tenantStartDate}
        />
      ) : props.activeStep === "shares" ? (
        <SharesStep
          shareStructureVersions={props.shareStructureVersions}
          tenantStartDate={props.tenantStartDate}
        />
      ) : props.activeStep === "business" ? (
        <BusinessStep
          dividendPeriods={props.dividendPeriods}
          shareBusinesses={props.shareBusinesses}
          tenantStartDate={props.tenantStartDate}
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
        nextStep={nextStep}
        previousStep={previousStep}
        requireHistoryConfirmation={requireHistoryConfirmation}
      />
    </div>
  )
}

export function GettingStartedPageView(props: GettingStartedPageViewProps) {
  const { migrationSnapshot, tenantName } = props
  const firstIncompleteStep =
    orderedStepKeys.find((key) => !isStepComplete(key, migrationSnapshot)) ??
    "review"
  const completionPercent = Math.round(
    (migrationSnapshot.completedStepCount / migrationSnapshot.totalStepCount) *
      100,
  )

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
      description={`Complete ${tenantName}'s historical setup before normal workspace records open.`}
    >
      <section className="grid gap-4 md:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardDescription>Status</CardDescription>
            <CardTitle>
              {migrationSnapshot.status.replaceAll("_", " ")}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Progress</CardDescription>
            <CardTitle>
              {migrationSnapshot.completedStepCount}/
              {migrationSnapshot.totalStepCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={completionPercent}>
              <ProgressLabel>Steps complete</ProgressLabel>
              <ProgressValue>{completionPercent}%</ProgressValue>
            </Progress>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Next</CardDescription>
            <CardTitle>{getStepMeta(firstIncompleteStep).label}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[280px_minmax(0,1fr)_280px]">
        <StepRail
          activeStep={props.activeStep}
          snapshot={migrationSnapshot}
        />
        <ActiveStepPanel {...props} />
        <SummaryCard
          chargeDefinitions={props.chargeDefinitions}
          migrationSnapshot={migrationSnapshot}
          shareBusinesses={props.shareBusinesses}
          shareStructureVersions={props.shareStructureVersions}
          tenantStartDate={props.tenantStartDate}
        />
      </section>
    </WorkspacePageShell>
  )
}
