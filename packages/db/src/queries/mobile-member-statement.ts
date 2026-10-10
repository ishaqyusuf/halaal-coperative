import { createPrismaClient } from "../prisma"
import { getMemberByUserId, getMemberStatementDetail } from "./members"
import {
  buildMobileMemberCommitments,
  type MobileMemberCoreMetric,
} from "./mobile-member-core"
import {
  getMobileMemberSharesSnapshot,
  type MobileMemberShareSection,
} from "./mobile-member-shares"

type StatementDetail = NonNullable<
  Awaited<ReturnType<typeof getMemberStatementDetail>>
>

type MobileMemberStatementRow = {
  detail: string
  format: "currency" | "percent" | "count" | null
  key: string
  label: string
  status: string | null
  value: number | null
}

export type MobileMemberStatementSnapshotSectionKey =
  | "profile"
  | "commitments"
  | "financing"
  | "shares"
  | "documents"
  | "charges"
  | "ledger"

export type MobileMemberStatementSnapshotSection = {
  emptyState: string
  key: MobileMemberStatementSnapshotSectionKey
  rows: MobileMemberStatementRow[]
  subtitle: string
  title: string
}

export type MobileMemberStatementSnapshot = {
  generatedAt: string
  member: {
    deductionSourceName: string | null
    email: string | null
    exitedAt: string | null
    id: string
    joinedAt: string
    kycStatus: string
    memberNumber: string
    memberType: string
    name: string
    status: string
  } | null
  sections: MobileMemberStatementSnapshotSection[]
  stats: MobileMemberCoreMetric[]
}

type StatementSummary = {
  activeLoanCount: number
  contributionsCount: number
  dividendAllocationCount: number
  totalDividendAllocations: number
  totalEstimatedMonthlyServicing: number
  totalOutstandingPrincipal: number
  totalSavingsSnapshot: number
} | null

function formatDateLabel(value: Date | null | undefined) {
  if (!value) return null

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(value)
}

function humanizeStatus(value: string | null | undefined) {
  if (!value) return null

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function emptyStatementStats(): MobileMemberCoreMetric[] {
  return [
    {
      detail: "No active commitment available",
      format: "currency",
      key: "active-commitment",
      label: "Active commitment",
      value: 0,
    },
    {
      detail: "No posted savings available",
      format: "currency",
      key: "savings",
      label: "Savings",
      value: 0,
    },
    {
      detail: "No active financing available",
      format: "currency",
      key: "financing",
      label: "Financing",
      value: 0,
    },
    {
      detail: "No published dividends",
      format: "currency",
      key: "dividends",
      label: "Dividends",
      value: 0,
    },
  ]
}

function emptyMobileMemberStatement(
  detail = "No linked member profile was found for this mobile session."
): MobileMemberStatementSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    member: null,
    sections: [
      {
        emptyState: detail,
        key: "profile",
        rows: [
          {
            detail,
            format: null,
            key: "member-profile",
            label: "Member profile needs linking",
            status: "Needs setup",
            value: null,
          },
        ],
        subtitle: "Membership identity and statement readiness.",
        title: "Profile",
      },
    ],
    stats: emptyStatementStats(),
  }
}

export function buildMobileMemberStatementStats(input: {
  activePlan: { amount: number; startsAt: Date | null } | null
  summary: StatementSummary
}): MobileMemberCoreMetric[] {
  return [
    {
      detail: input.activePlan?.startsAt
        ? `Active since ${formatDateLabel(input.activePlan.startsAt)}`
        : "No active commitment available",
      format: "currency",
      key: "active-commitment",
      label: "Active commitment",
      value: input.activePlan?.amount ?? 0,
    },
    {
      detail:
        (input.summary?.contributionsCount ?? 0) > 0
          ? `${input.summary?.contributionsCount ?? 0} posted contribution entries`
          : "No posted contribution entries",
      format: "currency",
      key: "savings",
      label: "Savings",
      value: input.summary?.totalSavingsSnapshot ?? 0,
    },
    {
      detail:
        (input.summary?.activeLoanCount ?? 0) > 0
          ? `${input.summary?.activeLoanCount ?? 0} active financing record(s)`
          : "No active financing",
      format: "currency",
      key: "financing",
      label: "Financing",
      value: input.summary?.totalOutstandingPrincipal ?? 0,
    },
    {
      detail:
        (input.summary?.dividendAllocationCount ?? 0) > 0
          ? `${input.summary?.dividendAllocationCount ?? 0} published allocation(s)`
          : "No published dividends",
      format: "currency",
      key: "dividends",
      label: "Dividends",
      value: input.summary?.totalDividendAllocations ?? 0,
    },
  ]
}

function buildProfileSection(
  detail: StatementDetail
): MobileMemberStatementSnapshotSection {
  const member = detail.member
  const email = member.user?.email ?? member.email

  return {
    emptyState: "No member profile detail is available.",
    key: "profile",
    rows: [
      {
        detail: `${humanizeStatus(member.memberType) ?? "Member"} profile`,
        format: null,
        key: "member-number",
        label: member.memberNumber,
        status: humanizeStatus(member.status),
        value: null,
      },
      {
        detail: email ?? "No email on profile",
        format: null,
        key: "email",
        label: "Email",
        status: member.user?.email ? "Account email" : "Member email",
        value: null,
      },
      {
        detail: member.deductionSource?.name ?? "No deduction source assigned",
        format: null,
        key: "deduction-source",
        label: "Deduction source",
        status: member.deductionSource ? "Linked" : "Not linked",
        value: null,
      },
      {
        detail: `Joined ${formatDateLabel(member.joinedAt) ?? "Not recorded"}`,
        format: null,
        key: "membership-dates",
        label: member.exitedAt
          ? `Exited ${formatDateLabel(member.exitedAt) ?? "Not recorded"}`
          : "Active membership period",
        status: humanizeStatus(member.kycStatus),
        value: null,
      },
    ],
    subtitle: "Membership identity, KYC status, and deduction source.",
    title: "Profile",
  }
}

function buildCommitmentsSection(
  detail: StatementDetail
): MobileMemberStatementSnapshotSection {
  const plan =
    detail.member.contributionPlans.find((item) => item.isActive) ??
    detail.member.contributionPlans[0] ??
    null
  const section = buildMobileMemberCommitments({
    activePlan: plan
      ? {
          amount: Number(plan.amount ?? 0),
          id: plan.id,
          interval: plan.interval,
          isActive: plan.isActive,
          name: plan.name,
          startsAt: plan.startsAt,
        }
      : null,
    contributions: detail.contributions.map((contribution) => ({
      amount: Number(contribution.amount ?? 0),
      channel: contribution.channel,
      extraSavingsAmount: Number(contribution.extraSavingsAmount ?? 0),
      id: contribution.id,
      periodLabel: contribution.periodLabel,
      postedAt: contribution.postedAt,
      reference: contribution.reference,
      status: contribution.status,
    })),
    summary: detail.summary
      ? {
          contributionsCount: detail.summary.contributionsCount,
          totalExtraSavingsContributions:
            detail.summary.totalExtraSavingsContributions,
          totalSavingsSnapshot: detail.summary.totalSavingsSnapshot,
        }
      : null,
  })

  return {
    emptyState: section.emptyState,
    key: "commitments",
    rows: section.rows,
    subtitle: section.subtitle,
    title: section.title,
  }
}

function emptyFinancingRow(): MobileMemberStatementRow {
  return {
    detail: "Approved financing and posted repayments will appear here.",
    format: null,
    key: "financing-empty",
    label: "No financing activity",
    status: null,
    value: null,
  }
}

function buildFinancingSection(
  detail: StatementDetail
): MobileMemberStatementSnapshotSection {
  const rows: MobileMemberStatementRow[] = []

  for (const loan of detail.loans.slice(0, 5)) {
    const nextScheduleItem =
      loan.repaymentScheduleItems.find((item) => item.status !== "paid") ??
      loan.repaymentScheduleItems[0] ??
      null

    rows.push({
      detail: [
        `${loan.termMonths} month term`,
        nextScheduleItem?.dueAt
          ? `Next due ${formatDateLabel(nextScheduleItem.dueAt)}`
          : "No open due date",
      ].join(" - "),
      format: "currency",
      key: `loan-${loan.id}`,
      label: loan.loanProduct.name,
      status: humanizeStatus(loan.status),
      value: Number(loan.outstandingPrincipal ?? 0),
    })
  }

  for (const repayment of detail.repayments.slice(0, 3)) {
    rows.push({
      detail: [
        repayment.loan.loanProduct.name,
        repayment.paidAt ? `Paid ${formatDateLabel(repayment.paidAt)}` : null,
        repayment.reference ? `Ref ${repayment.reference}` : null,
      ]
        .filter(Boolean)
        .join(" - "),
      format: "currency",
      key: `repayment-${repayment.id}`,
      label: "Repayment posted",
      status: humanizeStatus(repayment.status),
      value: Number(repayment.amount ?? 0),
    })
  }

  return {
    emptyState: "No financing or repayment records are available yet.",
    key: "financing",
    rows: rows.length > 0 ? rows : [emptyFinancingRow()],
    subtitle:
      "Review outstanding principal, due schedules, and posted repayments.",
    title: "Financing",
  }
}

function buildChargesSection(
  detail: StatementDetail
): MobileMemberStatementSnapshotSection {
  const pending = detail.chargeApplications.filter(
    (charge: any) => charge.status === "pending"
  )
  const rows: MobileMemberStatementRow[] = [
    {
      detail:
        pending.length > 0
          ? "Separately paid charges are waiting for payment evidence, waiver, or correction."
          : "No separately paid charges are pending.",
      format: "count",
      key: "pending-workflow-charges",
      label: "Pending separate charges",
      status: pending.length > 0 ? "Needs payment" : "Clear",
      value: pending.length,
    },
  ]

  for (const charge of detail.chargeApplications.slice(0, 6)) {
    const source = charge.procurementRequest
      ? `Procurement - ${charge.procurementRequest.itemName}`
      : charge.foodPurchaseApplication
        ? "Foodstuff Purchase"
        : charge.projectFinancingRequest
          ? `Project financing - ${charge.projectFinancingRequest.businessName}`
          : charge.loanRequest
            ? "Financing request"
            : (charge.chargeApplicability?.workflow?.replace(/_/g, " ") ??
              "Manual charge")

    rows.push({
      detail: [
        source,
        charge.assessedAt
          ? `Assessed ${formatDateLabel(charge.assessedAt)}`
          : null,
        humanizeStatus(charge.collectionMode),
      ]
        .filter(Boolean)
        .join(" - "),
      format: "currency",
      key: `charge-${charge.id}`,
      label: charge.chargeDefinition.name,
      status: humanizeStatus(charge.status),
      value: Number(charge.amount ?? 0),
    })
  }

  return {
    emptyState: "No charge applications are available.",
    key: "charges",
    rows,
    subtitle:
      "Workflow charges stay separate from financing, procurement, Foodstuff Purchase, and project principal amounts.",
    title: "Charges",
  }
}

function buildDocumentsSection(
  detail: StatementDetail
): MobileMemberStatementSnapshotSection {
  const rows: MobileMemberStatementRow[] = detail.member.documents
    .slice(0, 6)
    .map((document) => ({
      detail: [
        document.uploadedAt
          ? `Uploaded ${formatDateLabel(document.uploadedAt)}`
          : null,
        document.reviewNotes,
      ]
        .filter(Boolean)
        .join(" - "),
      format: null,
      key: `document-${document.id}`,
      label: humanizeStatus(document.documentType) ?? "Member document",
      status: humanizeStatus(document.reviewStatus),
      value: null,
    }))

  return {
    emptyState: "No uploaded member documents are available.",
    key: "documents",
    rows:
      rows.length > 0
        ? rows
        : [
            {
              detail: "No uploaded member documents are available.",
              format: null,
              key: "documents-empty",
              label: "Documents",
              status: "Not started",
              value: null,
            },
          ],
    subtitle: "KYC and member records currently visible to operations.",
    title: "Documents",
  }
}

function buildLedgerSection(
  detail: StatementDetail
): MobileMemberStatementSnapshotSection {
  const rows: MobileMemberStatementRow[] = detail.ledgerTransactions
    .slice(0, 8)
    .map((transaction) => {
      const debits = transaction.entries.filter(
        (entry) => entry.direction === "debit"
      )
      const amountEntries = debits.length > 0 ? debits : transaction.entries
      const amount = amountEntries.reduce(
        (total, entry) => total + Number(entry.amount ?? 0),
        0
      )

      return {
        detail: [
          transaction.postedAt
            ? `Posted ${formatDateLabel(transaction.postedAt)}`
            : null,
          transaction.reference ? `Ref ${transaction.reference}` : null,
          `${transaction.entries.length} ledger entr${
            transaction.entries.length === 1 ? "y" : "ies"
          }`,
        ]
          .filter(Boolean)
          .join(" - "),
        format: amount > 0 ? ("currency" as const) : null,
        key: `ledger-${transaction.id}`,
        label:
          transaction.narration ??
          humanizeStatus(transaction.transactionType) ??
          "Ledger transaction",
        status: humanizeStatus(transaction.transactionType),
        value: amount > 0 ? amount : null,
      }
    })

  return {
    emptyState: "No posted ledger transactions are available.",
    key: "ledger",
    rows:
      rows.length > 0
        ? rows
        : [
            {
              detail: "No posted ledger transactions are available.",
              format: null,
              key: "ledger-empty",
              label: "Ledger timeline",
              status: "No activity",
              value: null,
            },
          ],
    subtitle: "Recent accounting activity posted to your member ledger.",
    title: "Ledger",
  }
}

function toStatementSharesSection(
  section: MobileMemberShareSection
): MobileMemberStatementSnapshotSection {
  return {
    emptyState: section.emptyState,
    key: "shares",
    rows: section.rows,
    subtitle: section.subtitle,
    title: section.title,
  }
}

export async function getMobileMemberStatementSnapshot(input: {
  tenantId: string
  userId: string
}): Promise<MobileMemberStatementSnapshot> {
  const prisma = createPrismaClient()
  if (!prisma) return emptyMobileMemberStatement()

  const member = await getMemberByUserId(input, prisma)
  if (!member) return emptyMobileMemberStatement()

  const [detail, shares] = await Promise.all([
    getMemberStatementDetail(input.tenantId, member.id, prisma),
    getMobileMemberSharesSnapshot(input, prisma),
  ])
  if (!detail) {
    return emptyMobileMemberStatement(
      "No statement detail was found for this member profile."
    )
  }

  const activePlan =
    detail.member.contributionPlans.find((plan) => plan.isActive) ??
    detail.member.contributionPlans[0] ??
    null

  return {
    generatedAt: new Date().toISOString(),
    member: {
      deductionSourceName: detail.member.deductionSource?.name ?? null,
      email: detail.member.user?.email ?? detail.member.email,
      exitedAt: detail.member.exitedAt
        ? detail.member.exitedAt.toISOString()
        : null,
      id: member.id,
      joinedAt: detail.member.joinedAt.toISOString(),
      kycStatus: detail.member.kycStatus,
      memberNumber: member.memberNumber,
      memberType: detail.member.memberType,
      name: member.fullName,
      status: detail.member.status,
    },
    sections: [
      buildProfileSection(detail),
      buildCommitmentsSection(detail),
      buildFinancingSection(detail),
      toStatementSharesSection(shares.section),
      buildChargesSection(detail),
      buildDocumentsSection(detail),
      buildLedgerSection(detail),
    ],
    stats: buildMobileMemberStatementStats({
      activePlan: activePlan
        ? {
            amount: Number(activePlan.amount ?? 0),
            startsAt: activePlan.startsAt,
          }
        : null,
      summary: detail.summary,
    }),
  }
}
