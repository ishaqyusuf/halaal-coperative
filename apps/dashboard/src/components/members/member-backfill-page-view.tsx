import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { Badge } from "@halaalvest/ui/components/badge"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import { CurrencyPrefixInput } from "@halaalvest/ui/components/currency-input"
import { Input } from "@halaalvest/ui/components/input"
import { Separator } from "@halaalvest/ui/components/separator"
import { cn } from "@halaalvest/ui/lib/utils"
import { formatCurrency } from "@halaalvest/utils"
import {
  DashboardActionLink,
  DashboardDataTable,
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardSurfaceCard,
  DashboardTable,
  DashboardTableBody,
  DashboardTableCell,
  DashboardTableHead,
  DashboardTableHeaderCell,
  DashboardTableRow,
  TrendPill,
  WorkspacePageShell,
} from "@/components/dashboard"
import {
  DefaultingMonthsDialog,
  MemberBackfillAdjustmentDialog,
  MonthStatusControl,
} from "@/components/migration/member-backfill-controls"
import { MemberLedgerBackfillTable } from "@/components/migration/member-ledger-backfill-table"
import {
  CommitmentHistoryEntryForm,
  LoanHistoryEntryForm,
} from "@/components/migration/member-migration-history-forms"
import {
  queueBackfillApplyAction,
  queueBackfillDraftAction,
  upsertMigrationProfitAdjustmentAction,
} from "@/lib/dashboard-actions"
import type { loadMemberBackfillWorkflowData } from "@/lib/members"
import { MemberBackfillActivityWindowsForm } from "./member-backfill-activity-windows-form"
import { MemberBackfillFooterActionsSlot } from "./member-backfill-footer-slot"
import {
  getMemberBackfillAdjacentSteps,
  getMemberBackfillStepMeta,
  memberBackfillStepHref,
  memberBackfillSteps,
  type MemberBackfillStepKey,
} from "./member-backfill-steps"
import { MemberBackfillBaselineEditDialog } from "./member-backfill-baseline-edit-dialog"

type MemberBackfillData = Extract<
  Awaited<ReturnType<typeof loadMemberBackfillWorkflowData>>,
  { state: "ready" }
>

const memberBackfillLoanHistoryFormId = "member-backfill-loan-history-form"
const memberBackfillCommitmentHistoryFormId =
  "member-backfill-commitment-history-form"
const memberBackfillActivityWindowsFormId =
  "member-backfill-activity-windows-form"

function displayEnum(value: string) {
  return value.replaceAll("_", " ")
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set"

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00.000Z`))
}

function statusTone(status: MemberBackfillData["review"]["status"]) {
  if (status === "backfill_applied") return "positive"
  if (status === "backfill_draft" || status === "configured") return "warning"
  return "neutral"
}

function isStepComplete(
  step: MemberBackfillStepKey,
  data: MemberBackfillData
) {
  if (step === "baseline") return true
  if (step === "commitments") {
    return (
      data.memberAmountLogs.length > 0 ||
      data.member.activeCommitmentAmount !== null
    )
  }
  if (step === "activity") return true
  if (step === "loans") return true
  if (step === "profit") return true
  if (step === "review") return data.generatedLedgerRows.length > 0
  return data.review.status === "backfill_applied"
}

function MetricBlock({
  className,
  label,
  value,
}: {
  className?: string
  label: string
  value: React.ReactNode
}) {
  return (
    <div className={cn("border border-border/70 bg-muted/20 p-3", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-foreground">
        {value}
      </p>
    </div>
  )
}

function StepRail({
  activeStep,
  data,
}: {
  activeStep: MemberBackfillStepKey
  data: MemberBackfillData
}) {
  return (
    <aside className="hidden xl:sticky xl:top-24 xl:block xl:self-start">
      <DashboardSectionCard className="p-0">
        <div className="border-b border-border/70 p-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase">
            Backfill path
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {data.member.memberNumber}
          </p>
        </div>
        <div className="flex flex-col gap-2 p-3">
          {memberBackfillSteps.map((step, index) => {
            const active = step.key === activeStep
            const complete = isStepComplete(step.key, data)

            return (
              <Link
                className={cn(
                  "border px-3 py-3 text-left transition-colors",
                  active
                    ? "border-foreground bg-primary text-primary-foreground"
                    : "border-border/70 bg-muted/20 hover:bg-muted/40"
                )}
                href={memberBackfillStepHref(data.member.id, step.key)}
                key={step.key}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium">
                    Step {index + 1}
                  </span>
                  <Badge variant={active || !complete ? "secondary" : "default"}>
                    {complete ? "Done" : "Todo"}
                  </Badge>
                </div>
                <p className="mt-2 text-sm font-semibold">{step.label}</p>
              </Link>
            )
          })}
        </div>
      </DashboardSectionCard>
    </aside>
  )
}

function StepFooter({
  activeStep,
  hasStepNextAction,
  memberId,
}: {
  activeStep: MemberBackfillStepKey
  hasStepNextAction: boolean
  memberId: string
}) {
  const { nextStep, previousStep } = getMemberBackfillAdjacentSteps(activeStep)

  return (
    <div className="mt-6 flex flex-col gap-4">
      <Separator />
      <div className="flex flex-wrap justify-between gap-2">
        {previousStep ? (
          <Link
            className={buttonVariants({ variant: "outline" })}
            href={memberBackfillStepHref(memberId, previousStep)}
          >
            Previous
          </Link>
        ) : (
          <span />
        )}
        {nextStep && hasStepNextAction ? (
          <MemberBackfillFooterActionsSlot />
        ) : nextStep ? (
          <Link
            className={buttonVariants({})}
            href={memberBackfillStepHref(memberId, nextStep)}
          >
            Next
          </Link>
        ) : null}
      </div>
    </div>
  )
}

function BaselineStep({ data }: { data: MemberBackfillData }) {
  return (
    <DashboardSectionCard>
      <DashboardSectionHeader
        eyebrow="Step 1"
        title="Confirm member baseline"
        description="Check the member identity, joined date, current commitment, and backfill state before adding history."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <MemberBackfillBaselineEditDialog
              disabled={
                !data.canEditBackfill ||
                data.review.status === "backfill_applied"
              }
              member={data.member}
            />
            <TrendPill tone={statusTone(data.review.status)}>
              {displayEnum(data.review.status)}
            </TrendPill>
          </div>
        }
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricBlock label="Member" value={data.member.fullName} />
        <MetricBlock label="Member No." value={data.member.memberNumber} />
        <MetricBlock
          label="Member type"
          value={displayEnum(data.member.memberType)}
        />
        <MetricBlock label="Joined" value={formatDate(data.member.joinedAt)} />
        <MetricBlock
          label="Current commitment"
          value={
            data.member.activeCommitmentAmount === null
              ? "Not set"
              : formatCurrency(data.member.activeCommitmentAmount)
          }
        />
        <MetricBlock
          label="Phone"
          value={data.member.phoneNumber ?? "Not provided"}
        />
        <MetricBlock
          label="Email"
          value={data.member.email ?? "Not provided"}
        />
        <MetricBlock
          label="Occupation"
          value={data.member.occupation ?? "Not provided"}
        />
        <MetricBlock
          className="sm:col-span-2 xl:col-span-4"
          label="Address"
          value={data.member.address ?? "Not provided"}
        />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricBlock
          label="Commitment rows"
          value={data.memberAmountLogs.length}
        />
        <MetricBlock label="Activity windows" value={data.memberActivityEvents.length} />
        <MetricBlock label="Loan drafts" value={data.legacyLoanDrafts.length} />
        <MetricBlock
          label="Generated rows"
          value={data.generatedLedgerRows.length}
        />
      </div>
    </DashboardSectionCard>
  )
}

function CommitmentsStep({ data }: { data: MemberBackfillData }) {
  const disabled =
    !data.canEditBackfill || data.review.status === "backfill_applied"
  const nextHref = disabled
    ? undefined
    : memberBackfillStepHref(data.member.id, "activity")

  return (
    <DashboardSectionCard>
      <DashboardSectionHeader
        eyebrow="Step 2"
        title="Commitment history"
        description="Add dated commitment changes from the joined month through today."
      />
      <div className="mt-5">
        <CommitmentHistoryEntryForm
          disabled={disabled}
          formId={memberBackfillCommitmentHistoryFormId}
          memberId={data.member.id}
          memberJoinedAt={data.member.joinedAt}
          redirectTo={nextHref}
          showSubmitButton={!nextHref}
        />
      </div>
      <HistoryTable
        emptyLabel="No commitment history rows saved yet."
        rows={data.memberAmountLogs.map((row) => ({
          amount: formatCurrency(row.amount),
          date: row.effectiveFrom,
          detail: row.notes ?? "Monthly commitment",
          id: row.id,
        }))}
        title="Saved commitments"
      />
    </DashboardSectionCard>
  )
}

function ActivityStep({ data }: { data: MemberBackfillData }) {
  const disabled = !data.canEditBackfill || data.review.status === "backfill_applied"
  const nextHref = disabled
    ? undefined
    : memberBackfillStepHref(data.member.id, "loans")

  return (
    <DashboardSectionCard>
      <DashboardSectionHeader
        eyebrow="Step 3"
        title="Activity windows"
        description="Record inactive and resumed months that affect generated monthly rows."
        actions={
          data.generatedLedgerRows.length > 0 ? (
            <DefaultingMonthsDialog
              disabled={disabled}
              memberId={data.member.id}
              rows={data.generatedLedgerRows}
              triggerLabel="Review missed months"
              triggerVariant="default"
            />
          ) : null
        }
      />
      <div className="mt-5">
        <MemberBackfillActivityWindowsForm
          disabled={disabled}
          formId={memberBackfillActivityWindowsFormId}
          memberId={data.member.id}
          memberJoinedAt={data.member.joinedAt}
          redirectTo={nextHref}
          showSubmitButton={!nextHref}
        />
      </div>
    </DashboardSectionCard>
  )
}

function LoansStep({ data }: { data: MemberBackfillData }) {
  const disabled =
    !data.canEditBackfill || data.review.status === "backfill_applied"
  const nextHref = disabled
    ? undefined
    : memberBackfillStepHref(data.member.id, "profit")

  return (
    <DashboardSectionCard>
      <DashboardSectionHeader
        eyebrow="Step 4"
        title="Loan history"
        description="Add historical cooperative financing positions that existed before system go-live."
      />
      <div className="mt-5">
        <LoanHistoryEntryForm
          disabled={disabled}
          formId={memberBackfillLoanHistoryFormId}
          memberId={data.member.id}
          memberJoinedAt={data.member.joinedAt}
          memberNumberPrefix={data.memberNumberPrefix}
          memberOptions={data.memberOptions}
          redirectTo={nextHref}
          showSubmitButton={!nextHref}
        />
      </div>
    </DashboardSectionCard>
  )
}

function ProfitStep({ data }: { data: MemberBackfillData }) {
  const disabled = !data.canEditBackfill || data.review.status === "backfill_applied"

  return (
    <DashboardSectionCard>
      <DashboardSectionHeader
        eyebrow="Step 5"
        title="Profit exceptions"
        description="Add member-specific historical profit adjustments only when the default allocation is not enough."
      />
      <div className="mt-5 grid gap-3">
        {data.profitMigrationOptions.length > 0 ? (
          data.profitMigrationOptions.map((option) => (
            <form
              action={upsertMigrationProfitAdjustmentAction}
              className="grid gap-3 border border-border/70 bg-muted/20 p-3 sm:grid-cols-[minmax(0,1fr)_150px_150px_auto]"
              key={option.id}
            >
              <input name="memberId" type="hidden" value={data.member.id} />
              <input name="profitEntryId" type="hidden" value={option.id} />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {option.businessName}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(option.profitDate)} available{" "}
                  {formatCurrency(option.editableAvailableAmount)}
                </p>
                {option.memberMigrationAdjustmentAmount > 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Current member adjustment{" "}
                    {formatCurrency(option.memberMigrationAdjustmentAmount)}
                  </p>
                ) : null}
              </div>
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Amount
                <CurrencyPrefixInput
                  disabled={disabled}
                  min="0"
                  name="allocatedProfitAmount"
                  placeholder="0"
                  step="0.01"
                  type="number"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Share %
                <Input
                  disabled={disabled}
                  max="100"
                  min="0"
                  name="sharePercentage"
                  placeholder="Optional"
                  step="0.01"
                  type="number"
                />
              </label>
              <div className="flex items-end justify-end">
                <Button disabled={disabled} size="sm" type="submit">
                  Save
                </Button>
              </div>
            </form>
          ))
        ) : (
          <DashboardSurfaceCard>
            <p className="text-sm font-medium text-foreground">
              No profit periods available.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add business profit periods before member-specific profit
              exceptions can be captured.
            </p>
          </DashboardSurfaceCard>
        )}
      </div>
    </DashboardSectionCard>
  )
}

function ReviewStep({ data }: { data: MemberBackfillData }) {
  const applied = data.review.status === "backfill_applied"
  const controlsDisabled = applied || !data.canEditBackfill

  return (
    <DashboardSectionCard>
      <DashboardSectionHeader
        eyebrow="Step 6"
        title="Generated ledger review"
        description="Review the generated rows for this member and save a draft before applying."
        actions={
          !applied && data.generatedLedgerRows.length > 0 ? (
            <form action={queueBackfillDraftAction}>
              <input name="memberId" type="hidden" value={data.member.id} />
              <Button size="sm" type="submit" variant="outline">
                Save draft
              </Button>
            </form>
          ) : null
        }
      />
      {data.generatedLedgerError ? (
        <DashboardSurfaceCard className="mt-5 border-destructive/30 bg-destructive/10">
          <p className="text-sm font-medium text-destructive">
            Could not generate ledger preview
          </p>
          <p className="mt-1 text-sm text-destructive">
            {data.generatedLedgerError}
          </p>
        </DashboardSurfaceCard>
      ) : null}
      <div className="mt-5">
        <MemberLedgerBackfillTable
          isRowAdjustmentDisabled={(row) => controlsDisabled || !row.month}
          renderDefaultingControl={(row, disabled, triggerLabel) => (
            <DefaultingMonthsDialog
              disabled={disabled}
              memberId={data.member.id}
              rows={data.generatedLedgerRows}
              selectedMonth={row.month}
              triggerLabel={triggerLabel}
            />
          )}
          renderMonthStatusControl={(row, disabled) => (
            <MonthStatusControl
              disabled={disabled}
              memberId={data.member.id}
              row={row}
              rows={data.generatedLedgerRows}
            />
          )}
          renderRepaymentControl={(row, loan, disabled) => (
            <MemberBackfillAdjustmentDialog
              disabled={disabled}
              loan={loan}
              memberId={data.member.id}
              mode="repayment"
              month={row.month}
              period={row.period}
              savingsContribution={row.savingsContribution}
            />
          )}
          renderSavingsControl={(row, loans, disabled) => (
            <MemberBackfillAdjustmentDialog
              disabled={disabled}
              loans={loans}
              memberId={data.member.id}
              mode="savings"
              month={row.month}
              period={row.period}
              savingsContribution={row.savingsContribution}
            />
          )}
          segments={data.generatedLedgerSegments}
        />
      </div>
    </DashboardSectionCard>
  )
}

function ApplyStep({ data }: { data: MemberBackfillData }) {
  const applied = data.review.status === "backfill_applied"
  const disabled =
    applied ||
    !data.canEditBackfill ||
    data.generatedLedgerRows.length === 0 ||
    Boolean(data.generatedLedgerError)

  return (
    <DashboardSectionCard>
      <DashboardSectionHeader
        eyebrow="Step 7"
        title="Apply member backfill"
        description="Post the reviewed historical rows for this member. Applied backfill locks migration edits for this member."
        actions={
          applied ? <TrendPill tone="positive">Applied</TrendPill> : null
        }
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MetricBlock
          label="Generated rows"
          value={data.generatedLedgerRows.length}
        />
        <MetricBlock
          label="Draft batches"
          value={data.review.backfillDraftBatches}
        />
        <MetricBlock
          label="Applied months"
          value={data.review.appliedBackfillMonths}
        />
      </div>
      <form
        action={queueBackfillApplyAction}
        className="mt-5 grid gap-3 border border-border/70 bg-muted/20 p-4 sm:grid-cols-[minmax(0,1fr)_auto]"
      >
        <input name="memberId" type="hidden" value={data.member.id} />
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Type APPLY BACKFILL
          <Input
            disabled={disabled}
            name="confirmation"
            placeholder="APPLY BACKFILL"
            required
            type="text"
          />
        </label>
        <div className="flex items-end justify-end">
          <Button disabled={disabled} type="submit">
            Apply backfill
          </Button>
        </div>
      </form>
    </DashboardSectionCard>
  )
}

function HistoryTable({
  emptyLabel,
  rows,
  title,
}: {
  emptyLabel: string
  rows: Array<{ amount: string; date: string; detail: string; id: string }>
  title: string
}) {
  return (
    <DashboardDataTable className="mt-4">
      <DashboardTable className="min-w-[560px]">
        <DashboardTableHead>
          <DashboardTableHeaderCell>{title}</DashboardTableHeaderCell>
          <DashboardTableHeaderCell>Date</DashboardTableHeaderCell>
          <DashboardTableHeaderCell align="right">Amount</DashboardTableHeaderCell>
        </DashboardTableHead>
        <DashboardTableBody>
          {rows.length > 0 ? (
            rows.map((row) => (
              <DashboardTableRow key={row.id}>
                <DashboardTableCell>{row.detail}</DashboardTableCell>
                <DashboardTableCell>{row.date}</DashboardTableCell>
                <DashboardTableCell align="right">{row.amount}</DashboardTableCell>
              </DashboardTableRow>
            ))
          ) : (
            <DashboardTableRow>
              <DashboardTableCell className="text-muted-foreground">
                {emptyLabel}
              </DashboardTableCell>
              <DashboardTableCell>-</DashboardTableCell>
              <DashboardTableCell align="right">-</DashboardTableCell>
            </DashboardTableRow>
          )}
        </DashboardTableBody>
      </DashboardTable>
    </DashboardDataTable>
  )
}

function ActiveStepPanel({
  activeStep,
  data,
}: {
  activeStep: MemberBackfillStepKey
  data: MemberBackfillData
}) {
  if (activeStep === "baseline") return <BaselineStep data={data} />
  if (activeStep === "commitments") return <CommitmentsStep data={data} />
  if (activeStep === "activity") return <ActivityStep data={data} />
  if (activeStep === "loans") return <LoansStep data={data} />
  if (activeStep === "profit") return <ProfitStep data={data} />
  if (activeStep === "review") return <ReviewStep data={data} />
  return <ApplyStep data={data} />
}

export function MemberBackfillPageView({
  activeStep,
  data,
}: {
  activeStep: MemberBackfillStepKey
  data: MemberBackfillData
}) {
  const activeMeta = getMemberBackfillStepMeta(activeStep)
  const canAutoSaveStep =
    data.canEditBackfill && data.review.status !== "backfill_applied"
  const hasStepNextAction =
    canAutoSaveStep &&
    (activeStep === "commitments" ||
      activeStep === "activity" ||
      activeStep === "loans")

  return (
    <WorkspacePageShell
      eyebrow="Member backfill"
      title={data.member.fullName}
      description={`${data.member.memberNumber} joined ${formatDate(data.member.joinedAt)}. Complete historical setup for this member before applying generated ledger rows.`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <DashboardActionLink href="/members">Back to members</DashboardActionLink>
        <DashboardActionLink href={`/members/${data.member.id}`}>
          Open member detail
        </DashboardActionLink>
        <TrendPill tone={statusTone(data.review.status)}>
          {displayEnum(data.review.status)}
        </TrendPill>
      </div>

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <StepRail activeStep={activeStep} data={data} />
        <main>
          <DashboardSurfaceCard className="mb-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Current step
                </p>
                <h2 className="mt-1 text-xl font-semibold text-foreground">
                  {activeMeta.label}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {activeMeta.description}
                </p>
              </div>
              <Badge variant="secondary">
                Step {memberBackfillSteps.findIndex((step) => step.key === activeStep) + 1}
              </Badge>
            </div>
          </DashboardSurfaceCard>
          <ActiveStepPanel activeStep={activeStep} data={data} />
          <StepFooter
            activeStep={activeStep}
            hasStepNextAction={hasStepNextAction}
            memberId={data.member.id}
          />
        </main>
      </div>
    </WorkspacePageShell>
  )
}
