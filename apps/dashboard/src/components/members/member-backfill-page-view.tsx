import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { Badge } from "@halaalvest/ui/components/badge"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import { Separator } from "@halaalvest/ui/components/separator"
import { cn } from "@halaalvest/ui/lib/utils"
import { formatCurrency } from "@halaalvest/utils"
import {
  DashboardActionLink,
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardSurfaceCard,
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
  queueBackfillDraftAction,
  saveMemberProfitSeasonAdjustmentsAction,
} from "@/lib/dashboard-actions"
import type { loadMemberBackfillWorkflowData } from "@/lib/members"
import { MemberBackfillActivityWindowsForm } from "./member-backfill-activity-windows-form"
import { MemberBackfillApplyForm } from "./member-backfill-apply-form"
import {
  MemberBackfillFooterActionsSlot,
  MemberBackfillFooterPortal,
} from "./member-backfill-footer-slot"
import {
  MemberProfitSeasonAdjustmentTable,
  type MemberProfitSeasonAdjustmentSeason,
} from "./member-profit-season-adjustment-table"
import {
  getMemberBackfillAdjacentSteps,
  memberBackfillStepHref,
  memberBackfillSteps,
  type MemberBackfillStepKey,
} from "./member-backfill-steps"
import { MemberBackfillBaselineEditDialog } from "./member-backfill-baseline-edit-dialog"

type MemberBackfillData = Extract<
  Awaited<ReturnType<typeof loadMemberBackfillWorkflowData>>,
  { state: "ready" }
>

type ProfitMigrationOption = {
  businessName: string
  editableAvailableAmount: number
  id: string
  memberMigrationAdjustmentAmount: number
  memberMigrationAdjustmentSharePercentage?: number | null
  profitDate: string
  profitAmount: number
  seasonKey: string
  seasonLabel?: string | null
  seasonPeriodStart?: string | null
  seasonPeriodEnd?: string | null
  seasonStatus?: string | null
}

const memberBackfillLoanHistoryFormId = "member-backfill-loan-history-form"
const memberBackfillCommitmentHistoryFormId =
  "member-backfill-commitment-history-form"
const memberBackfillActivityWindowsFormId =
  "member-backfill-activity-windows-form"
const memberBackfillProfitAdjustmentFormId =
  "member-backfill-profit-adjustment-form"

function displayEnum(value: string) {
  return value.replaceAll("_", " ")
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set"

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00.000Z`))
}

function getFallbackSeasonLabel(option: ProfitMigrationOption) {
  return option.seasonLabel ?? `Dividend season (${formatDate(option.profitDate)})`
}

function getSeasonSharePercentage(
  entries: ProfitMigrationOption[]
): number | null {
  const sharePercentages = entries
    .map((entry) => entry.memberMigrationAdjustmentSharePercentage)
    .filter((value): value is number => value != null)

  if (sharePercentages.length !== entries.length) {
    return null
  }

  const [firstSharePercentage] = sharePercentages

  if (firstSharePercentage === undefined) {
    return null
  }

  return sharePercentages.every((value) => value === firstSharePercentage)
    ? firstSharePercentage
    : null
}

function groupProfitMigrationOptionsBySeason(
  options: ProfitMigrationOption[]
) {
  const seasonsByKey = new Map<string, ProfitMigrationOption[]>()

  for (const option of options) {
    const seasonEntries = seasonsByKey.get(option.seasonKey) ?? []
    seasonEntries.push(option)
    seasonsByKey.set(option.seasonKey, seasonEntries)
  }

  return Array.from(seasonsByKey.entries())
    .map(([key, entries]): MemberProfitSeasonAdjustmentSeason => {
      const firstEntry = entries[0]!

      return {
        businessNames: Array.from(
          new Set(entries.map((entry) => entry.businessName))
        ).sort((a, b) => a.localeCompare(b)),
        editableAvailableAmount: entries.reduce(
          (total, entry) => total + entry.editableAvailableAmount,
          0
        ),
        entries,
        key,
        label: getFallbackSeasonLabel(firstEntry),
        memberMigrationAdjustmentAmount: entries.reduce(
          (total, entry) => total + entry.memberMigrationAdjustmentAmount,
          0
        ),
        memberMigrationAdjustmentSharePercentage:
          getSeasonSharePercentage(entries),
        periodEnd: firstEntry.seasonPeriodEnd,
        periodStart: firstEntry.seasonPeriodStart,
        status: firstEntry.seasonStatus,
      }
    })
    .sort((a, b) => {
      const aDate = a.periodStart ?? a.entries[0]?.profitDate ?? ""
      const bDate = b.periodStart ?? b.entries[0]?.profitDate ?? ""

      return aDate.localeCompare(bDate) || a.label.localeCompare(b.label)
    })
}

function statusTone(status: MemberBackfillData["review"]["status"]) {
  if (status === "backfill_applied") return "positive"
  if (status === "backfill_draft" || status === "configured") return "warning"
  return "neutral"
}

function isStepComplete(step: MemberBackfillStepKey, data: MemberBackfillData) {
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
      <p className="mt-1 text-sm font-semibold break-words text-foreground">
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
                  <span className="text-xs font-medium">Step {index + 1}</span>
                  <Badge
                    variant={active || !complete ? "secondary" : "default"}
                  >
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
        <MetricBlock
          label="Activity windows"
          value={data.memberActivityEvents.length}
        />
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
          initialRows={data.memberAmountLogs}
          memberId={data.member.id}
          memberJoinedAt={data.member.joinedAt}
          redirectTo={nextHref}
          showSubmitButton={!nextHref}
        />
      </div>
    </DashboardSectionCard>
  )
}

function ActivityStep({ data }: { data: MemberBackfillData }) {
  const disabled =
    !data.canEditBackfill || data.review.status === "backfill_applied"
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
          initialRows={data.memberActivityEvents}
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
          cooperativeStartDate={data.tenantStartDate}
          disabled={disabled}
          formId={memberBackfillLoanHistoryFormId}
          initialRows={data.legacyLoanDrafts}
          memberId={data.member.id}
          memberJoinedAt={data.member.joinedAt}
          memberNumberPrefix={data.memberNumberPrefix}
          memberOptions={data.memberOptions}
          quickFillEnabled={data.quickFillEnabled}
          redirectTo={nextHref}
          showSubmitButton={!nextHref}
        />
      </div>
    </DashboardSectionCard>
  )
}

function ProfitStep({ data }: { data: MemberBackfillData }) {
  const disabled =
    !data.canEditBackfill || data.review.status === "backfill_applied"
  const profitMigrationOptions =
    data.profitMigrationOptions as ProfitMigrationOption[]
  const profitMigrationSeasons = groupProfitMigrationOptionsBySeason(
    profitMigrationOptions
  )
  const nextHref = disabled
    ? undefined
    : memberBackfillStepHref(data.member.id, "review")

  return (
    <DashboardSectionCard>
      <DashboardSectionHeader
        eyebrow="Step 5"
        title="Profit seasons"
        description="Capture member-specific historical profit adjustments by dividend season."
      />
      <form
        action={saveMemberProfitSeasonAdjustmentsAction}
        className="mt-5 grid gap-4"
        id={memberBackfillProfitAdjustmentFormId}
      >
        <input name="memberId" type="hidden" value={data.member.id} />
        {nextHref ? (
          <input name="redirectTo" type="hidden" value={nextHref} />
        ) : null}
        {profitMigrationSeasons.length > 0 ? (
          <MemberProfitSeasonAdjustmentTable
            disabled={disabled}
            seasons={profitMigrationSeasons}
          />
        ) : (
          <DashboardSurfaceCard>
            <p className="text-sm font-medium text-foreground">
              No profit seasons available.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Continue to review if this member has no season-specific
              historical profit adjustment.
            </p>
          </DashboardSurfaceCard>
        )}
        {nextHref ? (
          <MemberBackfillFooterPortal>
            <Button form={memberBackfillProfitAdjustmentFormId} type="submit">
              Next
            </Button>
          </MemberBackfillFooterPortal>
        ) : null}
      </form>
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
      <MemberBackfillApplyForm disabled={disabled} memberId={data.member.id} />
    </DashboardSectionCard>
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
  const canAutoSaveStep =
    data.canEditBackfill && data.review.status !== "backfill_applied"
  const hasStepNextAction =
    canAutoSaveStep &&
    (activeStep === "commitments" ||
      activeStep === "activity" ||
      activeStep === "loans" ||
      activeStep === "profit")

  return (
    <WorkspacePageShell
      eyebrow="Member backfill"
      title={data.member.fullName}
      description={`${data.member.memberNumber} joined ${formatDate(data.member.joinedAt)}. Complete historical setup for this member before applying generated ledger rows.`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <DashboardActionLink href="/members">
          Back to members
        </DashboardActionLink>
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
