import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { formatCurrency } from "@halaalvest/utils"
import type {
  FoodPurchaseApplicationRow,
  MemberPaymentReceiptRow,
  MemberShareApplicationRow,
  MemberUnitSharePosition,
  ProcurementRequestRow,
  ProjectFinancingRequestRow,
  SupportCaseRow,
  TenantSharePolicySettings,
  getMemberStatementDetail,
} from "@halaalvest/db"
import {
  DashboardPageFrame,
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardStatCard,
  TrendPill,
} from "@/components/dashboard"
import { MemberDocumentSelfServiceForm } from "@/components/member-document-self-service-form"

type MemberStatementDetail = NonNullable<
  Awaited<ReturnType<typeof getMemberStatementDetail>>
>

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "Not recorded"

  const date = value instanceof Date ? value : new Date(value)

  return date.toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatStatus(value: string | null | undefined) {
  return value ? value.replace(/_/g, " ") : "Not set"
}

function activeLoanCount(detail: MemberStatementDetail) {
  return detail.loans.filter((loan) =>
    ["approved", "disbursed", "active", "defaulted"].includes(loan.status)
  ).length
}

function latestOpenSupportCases(cases: SupportCaseRow[]) {
  return cases.filter((supportCase) =>
    ["open", "in_progress", "waiting_on_member"].includes(supportCase.status)
  )
}

function memberSupportPrefillHref(values: Record<string, string>) {
  const params = new URLSearchParams(values)

  return `/support?${params.toString()}`
}

export function MemberPortalOverview({
  detail,
  foodPurchaseApplications,
  procurementRequests,
  projectFinancingRequests,
  receipts,
  shareApplications,
  sharePolicy,
  sharePosition,
  supportCases,
}: {
  detail: MemberStatementDetail
  foodPurchaseApplications: FoodPurchaseApplicationRow[]
  procurementRequests: ProcurementRequestRow[]
  projectFinancingRequests: ProjectFinancingRequestRow[]
  receipts: MemberPaymentReceiptRow[]
  shareApplications: MemberShareApplicationRow[]
  sharePolicy: TenantSharePolicySettings
  sharePosition: MemberUnitSharePosition | null
  supportCases: SupportCaseRow[]
}) {
  const summary = detail.summary
  const activePlan =
    detail.member.contributionPlans.find((plan) => plan.isActive) ?? null
  const openSupportCases = latestOpenSupportCases(supportCases)
  const openAccountUpdateCases = openSupportCases.filter(
    (supportCase) => supportCase.category === "account_update"
  )
  const profileUpdateSupportHref = memberSupportPrefillHref({
    category: "account_update",
    description:
      "Please review my profile or document update request. The details are:",
    subject: "Profile or document update",
  })
  const pendingReceipts = receipts.filter((receipt) =>
    ["submitted", "under_review", "correction_requested"].includes(
      receipt.status
    )
  )
  const pendingShareApplications = shareApplications.filter(
    (application) => application.status === "pending"
  )
  const activeObligationCount =
    activeLoanCount(detail) +
    procurementRequests.filter((request) =>
      ["approved", "active", "purchased"].includes(request.status)
    ).length +
    projectFinancingRequests.filter((request) =>
      ["approved", "active"].includes(request.status)
    ).length +
    foodPurchaseApplications.filter(
      (application) => application.status === "approved"
    ).length

  return (
    <DashboardPageFrame>
      <section className="space-y-2">
        <p className="text-[11px] font-medium tracking-[0.22em] text-muted-foreground uppercase">
          Member dashboard
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              {detail.member.fullName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {detail.member.memberNumber} ·{" "}
              {formatStatus(detail.member.memberType)} ·{" "}
              {formatStatus(detail.member.status)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <MemberLink href="/member-statement-export">Statement</MemberLink>
            <MemberLink href="/payment-receipts">Receipts</MemberLink>
            <MemberLink href="/food-purchase">Foodstuff Purchase</MemberLink>
            <MemberLink href="/guarantor-approvals">Guarantor</MemberLink>
            <MemberLink href="/procurement">Procurement</MemberLink>
            <MemberLink href="/support">Support</MemberLink>
            <MemberLink href="/shares">Shares</MemberLink>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <DashboardStatCard
          detail={
            activePlan
              ? `Effective ${formatDate(activePlan.startsAt)}`
              : "No active commitment plan"
          }
          label="Monthly commitment"
          value={formatCurrency(summary?.activeCommitmentAmount ?? 0)}
        />
        <DashboardStatCard
          detail={`${summary?.contributionsCount ?? 0} posted contributions`}
          label="Savings snapshot"
          tone="positive"
          value={formatCurrency(summary?.totalSavingsSnapshot ?? 0)}
        />
        <DashboardStatCard
          detail="Extra savings above regular commitment"
          label="Special savings"
          value={formatCurrency(summary?.totalExtraSavingsContributions ?? 0)}
        />
        <DashboardStatCard
          detail={`${activeLoanCount(detail)} active financing records`}
          label="Outstanding financing"
          tone={summary?.totalOutstandingPrincipal ? "warning" : "default"}
          value={formatCurrency(summary?.totalOutstandingPrincipal ?? 0)}
        />
        <DashboardStatCard
          detail={`${activeObligationCount} active or approved items`}
          label="Active obligations"
          tone={activeObligationCount ? "warning" : "default"}
          value={activeObligationCount.toString()}
        />
        <DashboardStatCard
          detail={`${summary?.dividendAllocationCount ?? 0} published allocations`}
          label="Published dividends"
          value={formatCurrency(summary?.totalDividendAllocations ?? 0)}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <DashboardSectionCard>
          <DashboardSectionHeader
            actions={
              <>
                <TrendPill
                  tone={
                    detail.member.kycStatus === "verified"
                      ? "positive"
                      : "warning"
                  }
                >
                  {formatStatus(detail.member.kycStatus)}
                </TrendPill>
                <MemberLink href={profileUpdateSupportHref}>
                  Request update
                </MemberLink>
              </>
            }
            eyebrow="Profile"
            title="Profile status"
          />
          <dl className="mt-5 grid gap-4 text-sm md:grid-cols-2">
            <DataPoint
              label="Email"
              value={detail.member.email ?? detail.member.user?.email}
            />
            <DataPoint label="Phone" value={detail.member.phoneNumber} />
            <DataPoint
              label="Joined"
              value={formatDate(detail.member.joinedAt)}
            />
            <DataPoint
              label="Deduction source"
              value={detail.member.deductionSource?.name}
            />
            <DataPoint label="Occupation" value={detail.member.occupation} />
            <DataPoint label="Address" value={detail.member.address} />
            <DataPoint
              label="Open update requests"
              value={openAccountUpdateCases.length.toString()}
            />
          </dl>
          <MemberDocumentSelfServiceForm />
        </DashboardSectionCard>

        <DashboardSectionCard>
          <DashboardSectionHeader
            actions={<TrendPill>{shareApplications.length} requests</TrendPill>}
            eyebrow="Shares"
            title="Share position"
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <MiniMetric
              label="Share model"
              value={formatStatus(sharePolicy.configurationMode)}
            />
            <MiniMetric
              label="Unit value"
              value={formatCurrency(sharePolicy.unitAmount)}
            />
            <MiniMetric
              label="Approved units"
              value={
                sharePosition
                  ? sharePosition.totalApprovedUnits.toString()
                  : "Monthly history"
              }
            />
            <MiniMetric
              label="Pending requests"
              value={pendingShareApplications.length.toString()}
            />
          </div>
        </DashboardSectionCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <DashboardSectionCard>
          <DashboardSectionHeader
            actions={
              <>
                <TrendPill>{detail.loans.length} records</TrendPill>
                <MemberLink href="/procurement">Request item</MemberLink>
                <MemberLink href="/project-financing">
                  Request business
                </MemberLink>
              </>
            }
            eyebrow="Financing"
            title="Financing and obligations"
          />
          <div className="mt-5 space-y-3">
            <StatusRows
              empty="No active financing records."
              rows={detail.loans.slice(0, 4).map((loan) => ({
                detail: `${formatCurrency(Number(loan.outstandingPrincipal))} outstanding`,
                key: loan.id,
                label: loan.loanProduct?.name ?? "Financing",
                status: loan.status,
              }))}
            />
            <StatusRows
              empty="No procurement requests."
              rows={procurementRequests.slice(0, 3).map((request) => ({
                detail: formatCurrency(request.requestedCost),
                key: request.id,
                label: request.itemName,
                status: request.status,
              }))}
            />
            <StatusRows
              empty="No project financing requests."
              rows={projectFinancingRequests.slice(0, 3).map((request) => ({
                detail: formatCurrency(request.requestedAmount),
                key: request.id,
                label: request.businessName,
                status: request.status,
              }))}
            />
          </div>
        </DashboardSectionCard>

        <DashboardSectionCard>
          <DashboardSectionHeader
            actions={<TrendPill>{receipts.length} recent</TrendPill>}
            eyebrow="Payments"
            title="Receipts and support"
          />
          <div className="mt-5 space-y-5">
            <StatusRows
              empty="No recent payment receipts."
              rows={receipts.slice(0, 4).map((receipt) => ({
                detail: formatCurrency(receipt.totalAmount),
                key: receipt.id,
                label: receipt.paymentReference ?? formatDate(receipt.paidAt),
                status: receipt.status,
              }))}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniMetric
                label="Pending receipts"
                value={pendingReceipts.length.toString()}
              />
              <MiniMetric
                label="Open support"
                value={openSupportCases.length.toString()}
              />
            </div>
            <StatusRows
              empty="No recent support cases."
              rows={supportCases.slice(0, 3).map((supportCase) => ({
                detail: supportCase.category.replace(/_/g, " "),
                key: supportCase.id,
                label: supportCase.subject,
                status: supportCase.status,
              }))}
            />
          </div>
        </DashboardSectionCard>
      </section>

      <DashboardSectionCard>
        <DashboardSectionHeader
          actions={
            <>
              <TrendPill>
                {foodPurchaseApplications.length} applications
              </TrendPill>
              <MemberLink href="/food-purchase">Apply</MemberLink>
            </>
          }
          eyebrow="Foodstuff Purchase"
          title="Foodstuff Purchase applications"
        />
        <div className="mt-5">
          <StatusRows
            empty="No Foodstuff Purchase applications."
            rows={foodPurchaseApplications.slice(0, 5).map((application) => ({
              detail: formatCurrency(application.requestedAmount),
              key: application.id,
              label:
                application.itemDescription ??
                formatDate(application.cycle.periodMonth),
              status: application.status,
            }))}
          />
        </div>
      </DashboardSectionCard>

      <DashboardSectionCard>
        <DashboardSectionHeader
          actions={
            <>
              <TrendPill>{detail.ledgerTransactions.length} entries</TrendPill>
              <MemberLink href="/member-statement-export">Download</MemberLink>
            </>
          }
          eyebrow="Statement"
          title="Recent ledger activity"
        />
        <div className="mt-5">
          <StatusRows
            empty="No ledger activity has been posted yet."
            rows={detail.ledgerTransactions.slice(0, 6).map((transaction) => ({
              detail: formatDate(transaction.postedAt),
              key: transaction.id,
              label: transaction.narration ?? transaction.transactionType,
              status: transaction.transactionType,
            }))}
          />
        </div>
      </DashboardSectionCard>

      <DashboardSectionCard>
        <DashboardSectionHeader
          actions={
            <TrendPill>
              {detail.dividendAllocations.length} allocations
            </TrendPill>
          }
          eyebrow="Dividends"
          title="Published dividend allocations"
        />
        <div className="mt-5">
          <StatusRows
            empty="No published dividend allocations yet."
            rows={detail.dividendAllocations.slice(0, 5).map((allocation) => ({
              detail: `${formatCurrency(
                Number(allocation.allocationAmount)
              )} from ${formatCurrency(Number(allocation.savingsBasisAmount))} basis`,
              key: allocation.id,
              label: allocation.dividendPeriod.name,
              status: allocation.dividendPeriod.status,
            }))}
          />
        </div>
      </DashboardSectionCard>
    </DashboardPageFrame>
  )
}

function MemberLink({
  children,
  href,
}: {
  children: React.ReactNode
  href: string
}) {
  return (
    <Link
      className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-muted"
      href={href}
    >
      {children}
    </Link>
  )
}

function DataPoint({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium text-foreground">
        {value || "Not provided"}
      </dd>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 font-medium text-foreground capitalize">{value}</p>
    </div>
  )
}

function StatusRows({
  empty,
  rows,
}: {
  empty: string
  rows: Array<{
    detail: string
    key: string
    label: string
    status: string
  }>
}) {
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">{empty}</p>
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div
          className="flex items-center justify-between gap-4 border border-border bg-background px-3 py-2"
          key={row.key}
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {row.label}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{row.detail}</p>
          </div>
          <TrendPill tone={statusTone(row.status)}>
            {formatStatus(row.status)}
          </TrendPill>
        </div>
      ))}
    </div>
  )
}

function statusTone(status: string): "neutral" | "positive" | "warning" {
  if (
    [
      "approved",
      "active",
      "completed",
      "posted",
      "verified",
      "resolved",
      "closed",
      "fulfilled",
    ].includes(status)
  ) {
    return "positive"
  }

  if (
    [
      "rejected",
      "cancelled",
      "defaulted",
      "failed",
      "correction_requested",
    ].includes(status)
  ) {
    return "warning"
  }

  return "neutral"
}
