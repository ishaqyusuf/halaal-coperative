import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { Badge } from "@halaalvest/ui/components/badge"
import { buttonVariants } from "@halaalvest/ui/components/button"
import { Separator } from "@halaalvest/ui/components/separator"
import { cn } from "@halaalvest/ui/lib/utils"
import { formatCurrency } from "@halaalvest/utils"
import {
  DashboardActionLink,
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardSurfaceCard,
  TrendPill,
  WorkspaceEmptyState,
  WorkspacePageShell,
} from "@/components/dashboard"
import {
  DefaultingMonthsSheet,
  MemberBackfillAdjustmentSheet,
  MonthStatusControl,
} from "@/components/migration/member-backfill-controls"
import { MemberLedgerBackfillTable } from "@/components/migration/member-ledger-backfill-table"
import {
  CommitmentHistoryEntryForm,
  LoanHistoryEntryForm,
} from "@/components/migration/member-migration-history-forms"
import { MemberBackfillActionSheet } from "@/components/sheets/member-backfill-action-sheet"
import { MemberBackfillBaselineEditSheet } from "@/components/sheets/member-backfill-baseline-edit-sheet"
import type { loadMemberBackfillWorkflowData } from "@/lib/members"
import {
  GenerateBackfillDividendsContent,
  HistoricalSharePurchaseContent,
  OpeningBalanceApplyContent,
  OpeningBalanceCreateContent,
  OpeningBalanceReviewContent,
  OpeningBalanceReverseContent,
  ProfitSeasonAdjustmentContent,
  SaveBackfillDraftContent,
} from "./member-backfill-content"
import { MemberBackfillActivityWindowsForm } from "./member-backfill-activity-windows-form"
import { MemberBackfillApplyForm } from "./member-backfill-apply-form"
import { MemberBackfillFooterActionsSlot } from "./member-backfill-footer-slot"
import {
  getMemberBackfillAdjacentSteps,
  getMemberBackfillStepsForMode,
  memberBackfillStepHref,
  type MemberBackfillStepKey,
} from "./member-backfill-steps"

type MemberBackfillData = Extract<
  Awaited<ReturnType<typeof loadMemberBackfillWorkflowData>>,
  { state: "ready" }
>

export function MemberBackfillUnavailableView() {
  return (
    <WorkspacePageShell
      eyebrow="Member backfill"
      title="Member backfill"
      description="Member historical setup is available when the database runtime is active."
    >
      <WorkspaceEmptyState
        title="Member backfill needs the database runtime."
        body="Once the database-backed environment is active, this page will guide one member through historical setup and ledger backfill."
      />
    </WorkspacePageShell>
  )
}

const memberBackfillLoanHistoryFormId = "member-backfill-loan-history-form"
const memberBackfillCommitmentHistoryFormId =
  "member-backfill-commitment-history-form"
const memberBackfillActivityWindowsFormId =
  "member-backfill-activity-windows-form"
const memberOpeningBalanceFormId = "member-opening-balance-form"
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

function statusTone(status: MemberBackfillData["review"]["status"]) {
  if (status === "backfill_applied") return "positive"
  if (status === "backfill_draft" || status === "configured") return "warning"
  return "neutral"
}

function isStepComplete(step: MemberBackfillStepKey, data: MemberBackfillData) {
  if (step === "brought-forward") {
    return data.memberOpeningBalances.length > 0
  }
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

function openingBalanceStatusTone(
  status: MemberBackfillData["memberOpeningBalances"][number]["status"]
) {
  if (status === "approved" || status === "applied") return "positive"
  if (status === "pending_review") return "warning"
  return "neutral"
}

function OpeningBalanceRow({
  disabled,
  memberId,
  memberOptions,
  row,
}: {
  disabled: boolean
  memberId: string
  memberOptions: MemberBackfillData["memberOptions"]
  row: MemberBackfillData["memberOpeningBalances"][number]
}) {
  const pending = row.status === "pending_review"
  const approved = row.status === "approved"
  const applied = row.status === "applied"
  const totalAssets =
    row.commitmentSavingsBalance +
    row.specialSavingsBalance +
    row.shareCapitalBalance
  const guarantorOneLabel =
    memberOptions.find(
      (option) => option.id === row.activeFinancingGuarantorOneMemberId
    )?.label ?? row.activeFinancingGuarantorOneMemberId
  const guarantorTwoLabel =
    memberOptions.find(
      (option) => option.id === row.activeFinancingGuarantorTwoMemberId
    )?.label ?? row.activeFinancingGuarantorTwoMemberId

  return (
    <div className="border border-border/70 bg-muted/20 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {formatDate(row.openingDate)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Staged assets: {formatCurrency(totalAssets)}
          </p>
        </div>
        <TrendPill tone={openingBalanceStatusTone(row.status)}>
          {displayEnum(row.status)}
        </TrendPill>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <MetricBlock
          label="Commitment"
          value={formatCurrency(row.commitmentSavingsBalance)}
        />
        <MetricBlock
          label="Special savings"
          value={formatCurrency(row.specialSavingsBalance)}
        />
        <MetricBlock
          label="Share capital"
          value={formatCurrency(row.shareCapitalBalance)}
        />
        <MetricBlock label="Share units" value={row.shareUnits ?? "Not set"} />
        <MetricBlock
          label="Active financing"
          value={formatCurrency(row.activeFinancingOutstanding)}
        />
        <MetricBlock
          label="Financing start"
          value={formatDate(row.activeFinancingOpenedAt)}
        />
        <MetricBlock
          label="Guarantor 1"
          value={guarantorOneLabel ?? "Not set"}
        />
        <MetricBlock
          label="Guarantor 2"
          value={guarantorTwoLabel ?? "Not set"}
        />
        <MetricBlock
          label="Procurement"
          value={formatCurrency(row.procurementOutstanding)}
        />
        <MetricBlock
          label="Food Purchase"
          value={formatCurrency(row.foodPurchaseOutstanding)}
        />
      </div>
      {row.appliedLoanId ? (
        <p className="mt-3 border-t border-border/70 pt-3 text-xs break-all text-muted-foreground">
          Active financing opening posted as loan {row.appliedLoanId}.
        </p>
      ) : null}
      {row.appliedProcurementRequestId ? (
        <p className="mt-3 border-t border-border/70 pt-3 text-xs break-all text-muted-foreground">
          Procurement opening posted as request{" "}
          {row.appliedProcurementRequestId}.
        </p>
      ) : null}
      {row.appliedFoodPurchaseApplicationId ? (
        <p className="mt-3 border-t border-border/70 pt-3 text-xs break-all text-muted-foreground">
          Food Purchase opening posted as application{" "}
          {row.appliedFoodPurchaseApplicationId}.
        </p>
      ) : null}
      {row.sourceDocumentName || row.sourceDocumentUrl || row.notes ? (
        <div className="mt-3 border-t border-border/70 pt-3 text-xs text-muted-foreground">
          {row.sourceDocumentName ? (
            <p>Source: {row.sourceDocumentName}</p>
          ) : null}
          {row.sourceDocumentUrl ? (
            <a
              className="mt-1 inline-flex font-medium text-foreground underline-offset-4 hover:underline"
              href={row.sourceDocumentUrl}
              rel="noreferrer"
              target="_blank"
            >
              Open source document
            </a>
          ) : null}
          {row.notes ? <p className="mt-1">{row.notes}</p> : null}
        </div>
      ) : null}
      {pending ? (
        <div className="mt-3 flex justify-end border-t border-border/70 pt-3">
          <MemberBackfillActionSheet
            description="Approve or reject this staged opening position after reviewing the evidence."
            disabled={disabled}
            sheetId={`opening-balance-review:${row.id}`}
            title="Review opening position"
            triggerLabel="Review"
          >
            <OpeningBalanceReviewContent
              disabled={disabled}
              memberId={memberId}
              openingBalanceId={row.id}
            />
          </MemberBackfillActionSheet>
        </div>
      ) : approved ? (
        <div className="mt-3 flex justify-end border-t border-border/70 pt-3">
          <MemberBackfillActionSheet
            description="Apply the approved opening position to the member ledger and related opening obligations."
            disabled={disabled}
            sheetId={`opening-balance-apply:${row.id}`}
            title="Apply opening position"
            triggerLabel="Apply"
            variant="default"
          >
            <OpeningBalanceApplyContent
              disabled={disabled}
              memberId={memberId}
              openingBalanceId={row.id}
            />
          </MemberBackfillActionSheet>
        </div>
      ) : applied ? (
        <div className="mt-3 flex justify-end border-t border-border/70 pt-3">
          <MemberBackfillActionSheet
            description="Reverse a previously applied opening position with an audit note."
            disabled={disabled}
            sheetId={`opening-balance-reverse:${row.id}`}
            title="Reverse opening position"
            triggerLabel="Reverse"
          >
            <OpeningBalanceReverseContent
              disabled={disabled}
              memberId={memberId}
              openingBalanceId={row.id}
            />
          </MemberBackfillActionSheet>
        </div>
      ) : row.status === "reversed" && row.reversalNotes ? (
        <p className="mt-3 border-t border-border/70 pt-3 text-xs text-muted-foreground">
          Reversal note: {row.reversalNotes}
        </p>
      ) : row.reviewNotes ? (
        <p className="mt-3 border-t border-border/70 pt-3 text-xs text-muted-foreground">
          Review note: {row.reviewNotes}
        </p>
      ) : null}
    </div>
  )
}

function OpeningPositionPanel({ data }: { data: MemberBackfillData }) {
  const disabled =
    !data.canEditBackfill || data.review.status === "backfill_applied"

  return (
    <div className="border border-border/70 bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Badge variant="outline">Brought-forward</Badge>
          <h3 className="mt-3 text-sm font-semibold">
            Start from current book position
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Capture current balances and obligations as staged opening evidence.
          </p>
        </div>
        <TrendPill tone="neutral">Review/apply</TrendPill>
      </div>
      <div className="mt-4">
        <MemberBackfillActionSheet
          description="Capture current balances and active obligations as staged brought-forward evidence."
          disabled={disabled}
          sheetId="opening-position"
          size="wide"
          title="Stage opening position"
          triggerLabel="Stage opening position"
          variant="default"
        >
          <OpeningBalanceCreateContent
            data={data}
            disabled={disabled}
            formId={memberOpeningBalanceFormId}
          />
        </MemberBackfillActionSheet>
      </div>
      <div className="mt-5 grid gap-3">
        {data.memberOpeningBalances.length > 0 ? (
          data.memberOpeningBalances.map((row) => (
            <OpeningBalanceRow
              disabled={disabled}
              key={row.id}
              memberId={data.member.id}
              memberOptions={data.memberOptions}
              row={row}
            />
          ))
        ) : (
          <div className="border border-dashed border-border/70 p-3 text-sm text-muted-foreground">
            No brought-forward opening position has been staged for this member.
          </div>
        )}
      </div>
    </div>
  )
}

function HistoricalSharePurchasesPanel({ data }: { data: MemberBackfillData }) {
  const disabled =
    !data.canEditBackfill || data.review.status === "backfill_applied"
  const sharePolicy = data.tenantSharePolicy

  if (
    data.migrationSetupMode !== "historical_backfill" ||
    sharePolicy.configurationMode !== "unit_based"
  ) {
    return null
  }

  return (
    <div className="border border-border/70 bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Badge variant="outline">Unit shares</Badge>
          <h3 className="mt-3 text-sm font-semibold">
            Historical share purchases
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Record the number of share units bought and the date each payment
            was made.
          </p>
        </div>
        <TrendPill tone="neutral">
          {formatCurrency(sharePolicy.unitAmount)} per unit
        </TrendPill>
      </div>
      <div className="mt-4">
        <MemberBackfillActionSheet
          description="Record historical unit share purchases for this member."
          disabled={disabled}
          sheetId="historical-share-purchase"
          title="Add historical share purchase"
          triggerLabel="Add share purchase"
          variant="default"
        >
          <HistoricalSharePurchaseContent data={data} disabled={disabled} />
        </MemberBackfillActionSheet>
      </div>

      <div className="mt-4 grid gap-2">
        {data.memberSharePurchases.length > 0 ? (
          data.memberSharePurchases.map((purchase) => (
            <div
              className="grid gap-2 border border-border/70 bg-muted/20 p-3 text-sm sm:grid-cols-4"
              key={purchase.id}
            >
              <MetricBlock
                label="Paid date"
                value={formatDate(purchase.paidAt)}
              />
              <MetricBlock label="Units" value={purchase.shareUnits} />
              <MetricBlock
                label="Unit amount"
                value={formatCurrency(purchase.unitAmountSnapshot)}
              />
              <MetricBlock
                label="Share capital"
                value={formatCurrency(purchase.shareCapitalAmount)}
              />
            </div>
          ))
        ) : (
          <div className="border border-dashed border-border/70 p-3 text-sm text-muted-foreground">
            No historical share purchases have been recorded for this member.
          </div>
        )}
      </div>
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
  const steps = getMemberBackfillStepsForMode(data.migrationSetupMode)

  return (
    <aside className="hidden xl:sticky xl:top-24 xl:block xl:self-start">
      <DashboardSectionCard className="p-0">
        <div className="border-b border-border/70 p-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase">
            {data.migrationSetupMode === "brought_forward"
              ? "Brought-forward path"
              : "Backfill path"}
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {data.member.memberNumber}
          </p>
        </div>
        <div className="flex flex-col gap-2 p-3">
          {steps.map((step, index) => {
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
  setupMode,
}: {
  activeStep: MemberBackfillStepKey
  hasStepNextAction: boolean
  memberId: string
  setupMode: MemberBackfillData["migrationSetupMode"]
}) {
  const { nextStep, previousStep } = getMemberBackfillAdjacentSteps(
    activeStep,
    setupMode
  )

  if (!previousStep && !nextStep) {
    return null
  }

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
        description="Check the member identity, joined date, current commitment, and opening position before choosing full history or brought-forward migration."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <MemberBackfillBaselineEditSheet
              canManageCollectionSources={data.canManageCollectionSources}
              collectionSourceOptions={data.collectionSourceOptions}
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
      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <OpeningPositionPanel data={data} />
        <div className="border border-border/70 bg-background p-4">
          <Badge variant="outline">Full backfill</Badge>
          <h3 className="mt-3 text-sm font-semibold">
            Rebuild month-by-month history
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Use this path when the member ledger needs dated commitments,
            charges, repayments, and profit adjustments before posting.
          </p>
        </div>
      </div>
      <div className="mt-4">
        <HistoricalSharePurchasesPanel data={data} />
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

function BroughtForwardStep({ data }: { data: MemberBackfillData }) {
  return (
    <DashboardSectionCard>
      <DashboardSectionHeader
        eyebrow="Brought-forward"
        title="Capture current member position"
        description="Enter the member's current savings, special savings, share position, and any active obligations that should be carried forward."
        actions={
          <TrendPill tone={statusTone(data.review.status)}>
            {displayEnum(data.review.status)}
          </TrendPill>
        }
      />
      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <OpeningPositionPanel data={data} />
        <div className="border border-border/70 bg-muted/20 p-4">
          <p className="text-sm font-semibold text-foreground">
            Required current state
          </p>
          <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
            <p>Current savings balance</p>
            <p>Current special savings balance</p>
            <p>Current share capital or share units</p>
          </div>
          <Separator className="my-4" />
          <p className="text-sm text-muted-foreground">
            Active financing and procurement are optional here. Add them only
            when the member is currently serving those obligations.
          </p>
        </div>
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
            <DefaultingMonthsSheet
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
  const nextHref = disabled
    ? undefined
    : memberBackfillStepHref(data.member.id, "review")
  const canCalculateBackfillDividends =
    data.migrationSetupMode === "historical_backfill" &&
    data.tenantSharePolicy.configurationMode === "unit_based"

  return (
    <DashboardSectionCard>
      <DashboardSectionHeader
        eyebrow="Step 5"
        title="Profit seasons"
        description="Capture member-specific historical profit adjustments by dividend season."
        actions={
          canCalculateBackfillDividends ? (
            <MemberBackfillActionSheet
              description="Generate member backfill dividend allocations from the current historical share and profit season data."
              disabled={disabled}
              sheetId="calculate-backfill-dividends"
              title="Calculate backfill dividends"
              triggerLabel="Calculate dividends"
            >
              <GenerateBackfillDividendsContent disabled={disabled} />
            </MemberBackfillActionSheet>
          ) : null
        }
      />
      <ProfitSeasonAdjustmentContent
        data={data}
        disabled={disabled}
        formId={memberBackfillProfitAdjustmentFormId}
        nextHref={nextHref}
      />
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
            <MemberBackfillActionSheet
              description="Save the generated ledger preview as a backfill draft for this member."
              sheetId="save-backfill-draft"
              title="Save backfill draft"
              triggerLabel="Save draft"
            >
              <SaveBackfillDraftContent memberId={data.member.id} />
            </MemberBackfillActionSheet>
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
            <DefaultingMonthsSheet
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
            <MemberBackfillAdjustmentSheet
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
            <MemberBackfillAdjustmentSheet
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
      <div className="mt-5">
        <MemberBackfillActionSheet
          description="Confirm and post the reviewed historical rows for this member. Applied backfill locks migration edits for the member."
          disabled={disabled}
          sheetId="apply-backfill"
          title="Apply member backfill"
          triggerLabel="Apply backfill"
          variant="default"
        >
          <MemberBackfillApplyForm
            disabled={disabled}
            memberId={data.member.id}
          />
        </MemberBackfillActionSheet>
      </div>
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
  if (activeStep === "brought-forward") {
    return <BroughtForwardStep data={data} />
  }
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
  const isBroughtForward = data.migrationSetupMode === "brought_forward"

  return (
    <WorkspacePageShell
      eyebrow={isBroughtForward ? "Brought-forward member" : "Member backfill"}
      title={data.member.fullName}
      description={
        isBroughtForward
          ? `${data.member.memberNumber} joined ${formatDate(data.member.joinedAt)}. Capture the current book position for this member before continuing live operations.`
          : `${data.member.memberNumber} joined ${formatDate(data.member.joinedAt)}. Complete historical setup for this member before applying generated ledger rows.`
      }
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
            setupMode={data.migrationSetupMode}
          />
        </main>
      </div>
    </WorkspacePageShell>
  )
}
