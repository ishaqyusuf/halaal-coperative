import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError } from "../query-error"
import {
  getLoanRequestDetail,
  listLoanProducts,
  listLoanRequestsPage,
  quoteLoanRequest,
  submitLoanRequest,
  type LoanRequestQuote,
} from "./loans"
import { getMemberByUserId, getMemberStatementDetail } from "./members"

type LoanRequestPageRow = Awaited<
  ReturnType<typeof listLoanRequestsPage>
>["data"][number]
type MobileFinancingRequestSource = {
  availablePoolSnapshot: unknown
  charges: Array<{
    amount: unknown
    chargeDefinition: { code: string | null; name: string }
    collectionMode: string
    id: string
    status: string
  }>
  eligibleAmountSnapshot: unknown
  estimatedMonthlyServicing: unknown
  extraMonthlySavingsAmount: unknown
  guarantorApprovals: Array<{
    guarantorMember: { fullName: string; memberNumber: string }
    id: string
    respondedAt: Date | null
    status: string
  }>
  id: string
  loanProduct: { code: string | null; name: string }
  purpose: string | null
  requestedAmount: unknown
  requestedAt: Date
  requestedTermMonths: number
  reviewNotes: string | null
  status: string
}
type StatementDetail = NonNullable<
  Awaited<ReturnType<typeof getMemberStatementDetail>>
>

type MobileFinancingMetric = {
  detail: string
  format: "currency" | "percent" | "count"
  key: string
  label: string
  value: number
}

type MobileFinancingRow = {
  detail: string
  format: "currency" | "percent" | "count" | null
  key: string
  label: string
  status: string | null
  value: number | null
}

export type MobileFinancingProduct = {
  code: string | null
  id: string
  loanType: string
  maxSavingsMultiple: number
  name: string
  termMonths: number
}

export type MobileFinancingRequest = {
  availablePoolSnapshot: number
  charges: {
    amount: number
    code: string
    collectionMode: string
    id: string
    name: string
    status: string
  }[]
  eligibleAmountSnapshot: number
  estimatedMonthlyServicing: number
  extraMonthlySavingsAmount: number
  guarantorApprovals: {
    guarantorMemberNumber: string
    guarantorName: string
    id: string
    respondedAt: string | null
    status: string
  }[]
  id: string
  loanProductCode: string | null
  loanProductName: string
  purpose: string | null
  requestedAmount: number
  requestedAt: string
  requestedTermMonths: number
  reviewNotes: string | null
  status: string
}

export type MobileMemberFinancingSnapshot = {
  generatedAt: string
  member: {
    id: string
    memberNumber: string
    name: string
  } | null
  products: MobileFinancingProduct[]
  requestNextCursor: string | null
  requests: MobileFinancingRequest[]
  section: {
    emptyState: string
    generatedAt: string
    key: "financing"
    rows: MobileFinancingRow[]
    stats: MobileFinancingMetric[]
    subtitle: string
    title: string
  }
  state: "available" | "database_unavailable" | "member_profile_missing"
}

export type MobileFinancingRequestPage = {
  data: MobileFinancingRequest[]
  nextCursor: string | null
  state: "available" | "database_unavailable" | "member_profile_missing"
}

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

function emptyFinancingSection(detail: string) {
  return {
    emptyState: "No financing or repayment records are available yet.",
    generatedAt: new Date().toISOString(),
    key: "financing" as const,
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
    stats: [
      {
        detail: "No active financing",
        format: "currency" as const,
        key: "outstanding-principal",
        label: "Outstanding",
        value: 0,
      },
      {
        detail: "No monthly servicing due",
        format: "currency" as const,
        key: "monthly-servicing",
        label: "Monthly servicing",
        value: 0,
      },
      {
        detail: "No active financing records",
        format: "count" as const,
        key: "active-financing",
        label: "Active records",
        value: 0,
      },
    ],
    subtitle:
      "Review server-confirmed eligibility, requests, obligations, and repayments.",
    title: "Financing",
  }
}

function emptyFinancingSnapshot(
  state: MobileMemberFinancingSnapshot["state"],
  detail: string
): MobileMemberFinancingSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    member: null,
    products: [],
    requestNextCursor: null,
    requests: [],
    section: emptyFinancingSection(detail),
    state,
  }
}

function toMobileProduct(
  row: Awaited<ReturnType<typeof listLoanProducts>>[number]
): MobileFinancingProduct {
  return {
    code: row.code,
    id: row.id,
    loanType: row.loanType,
    maxSavingsMultiple: Number(row.maxSavingsMultiple ?? 0),
    name: row.name,
    termMonths: row.termMonths,
  }
}

export function toMobileFinancingRequest(
  row: MobileFinancingRequestSource
): MobileFinancingRequest {
  return {
    availablePoolSnapshot: Number(row.availablePoolSnapshot ?? 0),
    charges: (row.charges ?? []).map((charge: any) => ({
      amount: Number(charge.amount ?? 0),
      code: charge.chargeDefinition?.code ?? "",
      collectionMode: charge.collectionMode ?? "deduct_from_savings",
      id: charge.id,
      name: charge.chargeDefinition?.name ?? "Charge",
      status: charge.status,
    })),
    eligibleAmountSnapshot: Number(row.eligibleAmountSnapshot ?? 0),
    estimatedMonthlyServicing: Number(row.estimatedMonthlyServicing ?? 0),
    extraMonthlySavingsAmount: Number(row.extraMonthlySavingsAmount ?? 0),
    guarantorApprovals: row.guarantorApprovals.map((approval) => ({
      guarantorMemberNumber: approval.guarantorMember.memberNumber,
      guarantorName: approval.guarantorMember.fullName,
      id: approval.id,
      respondedAt: approval.respondedAt
        ? new Date(approval.respondedAt).toISOString()
        : null,
      status: approval.status,
    })),
    id: row.id,
    loanProductCode: row.loanProduct.code,
    loanProductName: row.loanProduct.name,
    purpose: row.purpose,
    requestedAmount: Number(row.requestedAmount ?? 0),
    requestedAt: new Date(row.requestedAt).toISOString(),
    requestedTermMonths: row.requestedTermMonths,
    reviewNotes: row.reviewNotes,
    status: row.status,
  }
}

function buildFinancingSection(detail: StatementDetail) {
  const rows: MobileFinancingRow[] = []

  for (const loan of detail.loans.slice(0, 5)) {
    const next =
      loan.repaymentScheduleItems.find((item) => item.status !== "paid") ??
      loan.repaymentScheduleItems[0] ??
      null
    rows.push({
      detail: [
        `${loan.termMonths} month term`,
        next?.dueAt
          ? `Next due ${formatDateLabel(next.dueAt)}`
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
    generatedAt: new Date().toISOString(),
    key: "financing" as const,
    rows:
      rows.length > 0
        ? rows
        : [
            {
              detail:
                "Approved financing and posted repayments will appear here.",
              format: null,
              key: "financing-empty",
              label: "No financing activity",
              status: null,
              value: null,
            },
          ],
    stats: [
      {
        detail:
          (detail.summary?.activeLoanCount ?? 0) > 0
            ? `${detail.summary?.activeLoanCount ?? 0} active financing record(s)`
            : "No active financing",
        format: "currency" as const,
        key: "outstanding-principal",
        label: "Outstanding",
        value: detail.summary?.totalOutstandingPrincipal ?? 0,
      },
      {
        detail: "Estimated monthly servicing",
        format: "currency" as const,
        key: "monthly-servicing",
        label: "Monthly servicing",
        value: detail.summary?.totalEstimatedMonthlyServicing ?? 0,
      },
      {
        detail: "Active financing records",
        format: "count" as const,
        key: "active-financing",
        label: "Active records",
        value: detail.summary?.activeLoanCount ?? 0,
      },
    ],
    subtitle:
      "Review server-confirmed eligibility, requests, obligations, and repayments.",
    title: "Financing",
  }
}

async function resolveMember(
  input: { tenantId: string; userId: string },
  prisma: PrismaClient
) {
  return getMemberByUserId(input, prisma)
}

export async function getMobileMemberFinancingSnapshot(
  input: { tenantId: string; userId: string },
  prismaOverride?: PrismaClient
): Promise<MobileMemberFinancingSnapshot> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) {
    return emptyFinancingSnapshot(
      "database_unavailable",
      "Financing self-service needs the database runtime."
    )
  }
  const member = await resolveMember(input, prisma)
  if (!member) {
    return emptyFinancingSnapshot(
      "member_profile_missing",
      "No linked member profile was found for this mobile session."
    )
  }

  const [detail, products, requestPage] = await Promise.all([
    getMemberStatementDetail(input.tenantId, member.id, prisma),
    listLoanProducts(input.tenantId, prisma),
    listLoanRequestsPage(
      input.tenantId,
      { memberId: member.id, pageSize: 20 },
      prisma
    ),
  ])
  if (!detail) {
    return emptyFinancingSnapshot(
      "member_profile_missing",
      "No linked member statement was found for this mobile session."
    )
  }

  return {
    generatedAt: new Date().toISOString(),
    member: {
      id: member.id,
      memberNumber: member.memberNumber,
      name: member.fullName,
    },
    products: products.map(toMobileProduct),
    requestNextCursor: requestPage.meta.cursor,
    requests: requestPage.data.map(toMobileFinancingRequest),
    section: buildFinancingSection(detail),
    state: "available",
  }
}

export async function getMobileMemberFinancingRequestPage(
  input: {
    cursor?: string | null
    pageSize?: number
    tenantId: string
    userId: string
  },
  prismaOverride?: PrismaClient
): Promise<MobileFinancingRequestPage> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) {
    return { data: [], nextCursor: null, state: "database_unavailable" }
  }
  const member = await resolveMember(input, prisma)
  if (!member) {
    return { data: [], nextCursor: null, state: "member_profile_missing" }
  }
  const page = await listLoanRequestsPage(
    input.tenantId,
    {
      cursor: input.cursor,
      memberId: member.id,
      pageSize: Math.min(Math.max(input.pageSize ?? 20, 1), 50),
    },
    prisma
  )

  return {
    data: page.data.map(toMobileFinancingRequest),
    nextCursor: page.meta.cursor,
    state: "available",
  }
}

export async function getMobileMemberFinancingRequestDetail(
  input: {
    loanRequestId: string
    tenantId: string
    userId: string
  },
  prismaOverride?: PrismaClient
): Promise<MobileFinancingRequest | null> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  const member = await resolveMember(input, prisma)
  if (!member) return null
  const request = await getLoanRequestDetail(
    {
      id: input.loanRequestId,
      memberId: member.id,
      tenantId: input.tenantId,
    },
    prisma
  )

  return request ? toMobileFinancingRequest(request) : null
}

export async function quoteMobileMemberFinancingRequest(
  input: {
    extraMonthlySavingsAmount?: number | null
    loanProductId: string
    requestedAmount: number
    requestedTermMonths: number
    tenantId: string
    userId: string
  },
  prismaOverride?: PrismaClient
): Promise<LoanRequestQuote> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma)
    throw new Error(
      "Financing quote is unavailable without database configuration."
    )
  const member = await resolveMember(input, prisma)
  if (!member) {
    throw ExpectedQueryError.precondition(
      "Member profile needs linking before quoting financing requests."
    )
  }

  return quoteLoanRequest(
    {
      extraMonthlySavingsAmount: input.extraMonthlySavingsAmount ?? undefined,
      loanProductId: input.loanProductId,
      memberId: member.id,
      requestedAmount: input.requestedAmount,
      requestedTermMonths: input.requestedTermMonths,
      tenantId: input.tenantId,
    },
    prisma
  )
}

export async function createMobileMemberFinancingRequestForSession(
  input: {
    chargeQuoteHash: string
    extraMonthlySavingsAmount?: number | null
    loanProductId: string
    purpose?: string | null
    requestedAmount: number
    requestedTermMonths: number
    tenantId: string
    userId: string
  },
  prismaOverride?: PrismaClient
): Promise<MobileFinancingRequest> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) {
    throw new Error(
      "Financing requests are unavailable without database configuration."
    )
  }
  const member = await resolveMember(input, prisma)
  if (!member) {
    throw ExpectedQueryError.precondition(
      "Member profile needs linking before submitting financing requests."
    )
  }
  const created = await submitLoanRequest(
    {
      actorUserId: input.userId,
      expectedChargeQuoteHash: input.chargeQuoteHash,
      extraMonthlySavingsAmount: input.extraMonthlySavingsAmount ?? undefined,
      loanProductId: input.loanProductId,
      memberId: member.id,
      purpose: input.purpose ?? undefined,
      requestedAmount: input.requestedAmount,
      requestedTermMonths: input.requestedTermMonths,
      tenantId: input.tenantId,
    },
    prisma
  )
  const page = await listLoanRequestsPage(
    input.tenantId,
    { memberId: member.id, pageSize: 20 },
    prisma
  )
  const request = page.data.find((item) => item.id === created.id)
  if (!request)
    throw ExpectedQueryError.notFound("Financing request not found.")

  return toMobileFinancingRequest(request)
}
