import { formatCurrency } from "@halaalvest/utils"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@halaalvest/ui/components/alert"
import { Badge } from "@halaalvest/ui/components/badge"
import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { ArrowLeftIcon, CircleAlert } from "lucide-react"
import {
  DashboardActionLink,
  DashboardPageHeader,
  DashboardPageShell,
  DashboardSectionCard,
  DashboardSectionHeader,
  WorkspaceEmptyState,
  WorkspacePageShell,
} from "@/components/dashboard"
import { MemberBalanceStatCards } from "@/components/member-balance-stat-cards"
import { MemberDetailActions } from "@/components/member-detail-actions"
import {
  OpenMemberDetailCommitmentSheet,
  OpenMemberDetailDocumentReviewSheet,
  OpenMemberDetailDocumentSheet,
  OpenMemberDetailEditSheet,
  OpenMemberDetailKycSheet,
  OpenMemberStatusDialog,
} from "@/components/open-member-detail-sheet"
import { MemberDetailSheet } from "@/components/sheets/member-detail-sheet"
import { MemberStatusDialog } from "@/components/sheets/member-status-dialog"
import type { MemberDetailPageData } from "@/lib/members/load-member-detail-page"
import { getMemberKycStatusLabel } from "@/lib/members/member-kyc-transitions"
import { getMemberMigrationStartHref } from "@/lib/members/member-migration-routing"
import {
  getMemberState,
  getMemberTypeLabel,
  getOpeningStepLabel,
  memberStateToneClassNames,
} from "@/lib/members/member-status-words"
import { formatDayMonthYear } from "@/utils/format"

type ReadyMemberDetailPageData = Extract<
  MemberDetailPageData,
  { state: "ready" }
>

export function MemberDetailUnavailableView() {
  return (
    <WorkspacePageShell
      eyebrow="Members"
      title="Member"
      description="Member details can't load right now."
    >
      <WorkspaceEmptyState
        title="Member details are not available."
        body="Try again in a moment."
      />
    </WorkspacePageShell>
  )
}

function DetailRow({
  action,
  label,
  value,
}: {
  action?: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-border/70 py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-4">
      <dt className="text-sm text-muted-foreground sm:w-40 sm:shrink-0">
        {label}
      </dt>
      <dd className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2 font-medium break-words text-foreground">
        <span className="min-w-0">{value}</span>
        {action}
      </dd>
    </div>
  )
}

function ListRow({
  amount,
  sub,
  title,
}: {
  amount: string
  sub?: string | null
  title: string
}) {
  return (
    <li className="flex items-start justify-between gap-4 border-b border-border/70 py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="font-medium text-foreground">{title}</p>
        {sub ? <p className="text-sm text-muted-foreground">{sub}</p> : null}
      </div>
      <p className="shrink-0 font-semibold text-foreground tabular-nums">
        {amount}
      </p>
    </li>
  )
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <p className="py-3 text-sm text-muted-foreground">{children}</p>
}

const kycTone: Record<string, string> = {
  not_started: memberStateToneClassNames.warning,
  pending: memberStateToneClassNames.warning,
  rejected: memberStateToneClassNames.danger,
  verified: memberStateToneClassNames.good,
}

const documentStatusLabels: Record<string, string> = {
  pending: "Waiting to be checked",
  rejected: "Rejected",
  verified: "Checked",
}

export function MemberDetailView({
  canChangeWorkplace,
  canManageCommitments,
  canManageMembers,
  commitmentStartsAtGoLive,
  detail,
  operationalReadiness,
  quickFillEnabled,
}: ReadyMemberDetailPageData) {
  const { member, summary } = detail
  const currentPlan =
    member.contributionPlans.find((plan) => plan.isActive) ?? null
  const activePlan = currentPlan
    ? { ...currentPlan, amount: Number(currentPlan.amount) }
    : null
  const state = getMemberState(member.status, operationalReadiness)
  const migrationMode = operationalReadiness.migration.mode
  const openingStep = getOpeningStepLabel(migrationMode)
  const issues = operationalReadiness.issues
  const email = member.email ?? member.user?.email ?? null
  const today = new Date()

  return (
    <DashboardPageShell>
      <div className="flex flex-col gap-3">
        <Link
          className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-medium text-foreground underline-offset-4 hover:underline"
          href="/members"
        >
          <ArrowLeftIcon aria-hidden className="size-4" />
          All members
        </Link>
        <DashboardPageHeader
          actions={
            <MemberDetailActions
              canManageMembers={canManageMembers}
              memberId={member.id}
              memberNumber={member.memberNumber}
              status={member.status}
            />
          }
          description={`${member.memberNumber} · Joined ${formatDayMonthYear(member.joinedAt)}`}
          title={member.fullName}
        />
      </div>

      {!operationalReadiness.isReady ? (
        <Alert className="items-start border-amber-300 bg-amber-50 px-4 py-4 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
          <CircleAlert className="mt-0.5 size-5" />
          <AlertTitle className="text-base">
            Not ready to save or borrow yet
          </AlertTitle>
          <AlertDescription className="mt-1 text-sm text-amber-950 dark:text-amber-100">
            <ul className="list-disc space-y-1 pl-5">
              {issues.includes("member_inactive") ? (
                <li>Make the member active.</li>
              ) : null}
              {issues.includes("kyc_unverified") ? (
                <li>Check and verify their KYC.</li>
              ) : null}
              {issues.includes("migration_incomplete") ? (
                <li>
                  {migrationMode === "brought_forward"
                    ? "Add their opening balance."
                    : "Add their past records."}
                </li>
              ) : null}
            </ul>
            {canManageMembers ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {issues.includes("member_inactive") ? (
                  <OpenMemberStatusDialog
                    memberId={member.id}
                    status="active"
                  />
                ) : null}
                {issues.includes("kyc_unverified") ? (
                  <OpenMemberDetailKycSheet label="Verify KYC" />
                ) : null}
                {issues.includes("migration_incomplete") ? (
                  <DashboardActionLink
                    href={getMemberMigrationStartHref(member.id, migrationMode)}
                    variant="secondary"
                  >
                    {operationalReadiness.migration.state === "draft"
                      ? `Continue ${openingStep.toLowerCase()}`
                      : `Add ${openingStep.toLowerCase()}`}
                  </DashboardActionLink>
                ) : null}
              </div>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <MemberBalanceStatCards summary={summary} />

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <DashboardSectionCard>
          <DashboardSectionHeader
            actions={canManageMembers ? <OpenMemberDetailEditSheet /> : null}
            headingLevel={2}
            title="Details"
          />
          <dl className="mt-2">
            <DetailRow
              label="Status"
              value={
                <Badge
                  className={memberStateToneClassNames[state.tone]}
                  variant="outline"
                >
                  {state.label}
                </Badge>
              }
            />
            <DetailRow
              label="Phone"
              value={member.phoneNumber ?? "Not added"}
            />
            <DetailRow label="Email" value={email ?? "Not added"} />
            <DetailRow
              label="Workplace"
              value={member.deductionSource?.name ?? "None"}
            />
            <DetailRow
              label="Member type"
              value={getMemberTypeLabel(member.memberType)}
            />
            <DetailRow
              label="Occupation"
              value={member.occupation ?? "Not added"}
            />
            <DetailRow label="Address" value={member.address ?? "Not added"} />
          </dl>
        </DashboardSectionCard>

        <DashboardSectionCard>
          <DashboardSectionHeader
            actions={
              canManageCommitments ? <OpenMemberDetailCommitmentSheet /> : null
            }
            headingLevel={2}
            title="Monthly savings"
          />
          <p className="mt-4 text-3xl font-semibold text-foreground tabular-nums">
            {formatCurrency(summary?.activeCommitmentAmount ?? 0)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {activePlan
              ? activePlan.startsAtGoLive && commitmentStartsAtGoLive
                ? "Starts the month you go live"
                : `Since ${formatDayMonthYear(activePlan.startsAt)}`
              : "No amount set yet"}
          </p>
          {member.contributionPlans.length > 1 ? (
            <details className="mt-4 rounded-lg border border-border/70">
              <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium text-foreground">
                Earlier amounts
              </summary>
              <ul className="border-t border-border/70 px-3">
                {member.contributionPlans.map((plan) => (
                  <ListRow
                    amount={formatCurrency(Number(plan.amount))}
                    key={plan.id}
                    sub={
                      plan.isActive
                        ? plan.startsAt > today
                          ? "Starts later"
                          : "Current"
                        : null
                    }
                    title={`${formatDayMonthYear(plan.startsAt)}${
                      plan.endsAt
                        ? ` to ${formatDayMonthYear(plan.endsAt)}`
                        : ""
                    }`}
                  />
                ))}
              </ul>
            </details>
          ) : null}
        </DashboardSectionCard>
      </section>

      <DashboardSectionCard>
        <DashboardSectionHeader
          actions={
            canManageMembers ? (
              <>
                <OpenMemberDetailKycSheet />
                <OpenMemberDetailDocumentSheet />
              </>
            ) : null
          }
          headingLevel={2}
          title="KYC"
        />
        <dl className="mt-2">
          <DetailRow
            label="KYC"
            value={
              <Badge className={kycTone[member.kycStatus]} variant="outline">
                {getMemberKycStatusLabel(member.kycStatus)}
              </Badge>
            }
          />
          <DetailRow
            label="ID"
            value={
              member.kycDocumentType
                ? `${member.kycDocumentType}${member.governmentIdNumber ? ` · ${member.governmentIdNumber}` : ""}`
                : "Not added"
            }
          />
          {member.kycReviewNotes ? (
            <DetailRow label="Notes" value={member.kycReviewNotes} />
          ) : null}
        </dl>
        <h3 className="mt-5 text-base font-semibold text-foreground">
          Documents
        </h3>
        {member.documents.length ? (
          <ul className="mt-1">
            {member.documents.map((document) => (
              <li
                className="flex flex-col gap-2 border-b border-border/70 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                key={document.id}
              >
                <div className="min-w-0">
                  <a
                    className="font-medium text-foreground underline underline-offset-4"
                    href={document.documentUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {document.documentType}
                  </a>
                  <p className="text-sm text-muted-foreground">
                    {documentStatusLabels[document.reviewStatus] ??
                      document.reviewStatus}{" "}
                    · Added {formatDayMonthYear(document.uploadedAt)}
                  </p>
                </div>
                {canManageMembers ? (
                  <OpenMemberDetailDocumentReviewSheet
                    documentId={document.id}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyLine>No documents yet.</EmptyLine>
        )}
      </DashboardSectionCard>

      <section className="grid gap-4 xl:grid-cols-3">
        <DashboardSectionCard>
          <DashboardSectionHeader headingLevel={2} title="Recent savings" />
          {detail.contributions.length ? (
            <ul className="mt-1">
              {detail.contributions.map((contribution) => (
                <ListRow
                  amount={formatCurrency(Number(contribution.amount))}
                  key={contribution.id}
                  sub={formatDayMonthYear(contribution.postedAt)}
                  title={contribution.periodLabel ?? "Savings"}
                />
              ))}
            </ul>
          ) : (
            <EmptyLine>No savings paid yet.</EmptyLine>
          )}
        </DashboardSectionCard>

        <DashboardSectionCard>
          <DashboardSectionHeader headingLevel={2} title="Loans" />
          {detail.loans.length ? (
            <ul className="mt-1">
              {detail.loans.map((loan) => {
                const next = loan.repaymentScheduleItems[0]

                return (
                  <ListRow
                    amount={formatCurrency(Number(loan.outstandingPrincipal))}
                    key={loan.id}
                    sub={
                      next
                        ? `Next ${formatCurrency(Number(next.totalDue) - Number(next.amountPaid))} due ${formatDayMonthYear(next.dueAt)}`
                        : `${formatCurrency(Number(loan.principalAmount))} borrowed`
                    }
                    title={loan.loanProduct.name}
                  />
                )
              })}
            </ul>
          ) : (
            <EmptyLine>No loans.</EmptyLine>
          )}
        </DashboardSectionCard>

        <DashboardSectionCard>
          <DashboardSectionHeader headingLevel={2} title="Loan repayments" />
          {detail.repayments.length ? (
            <ul className="mt-1">
              {detail.repayments.map((repayment) => (
                <ListRow
                  amount={formatCurrency(Number(repayment.amount))}
                  key={repayment.id}
                  sub={formatDayMonthYear(repayment.paidAt)}
                  title={repayment.loan.loanProduct.name}
                />
              ))}
            </ul>
          ) : (
            <EmptyLine>No repayments yet.</EmptyLine>
          )}
        </DashboardSectionCard>
      </section>

      <div>
        <DashboardActionLink href={`/members/${member.id}/statement`}>
          See full statement
        </DashboardActionLink>
      </div>

      <MemberDetailSheet
        activePlan={activePlan}
        canChangeWorkplace={canChangeWorkplace}
        commitmentStartsAtGoLive={commitmentStartsAtGoLive}
        devMode={quickFillEnabled}
        documents={member.documents}
        member={member}
      />
      {canManageMembers ? <MemberStatusDialog /> : null}
    </DashboardPageShell>
  )
}
