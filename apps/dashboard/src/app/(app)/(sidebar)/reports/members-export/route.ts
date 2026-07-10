import { listMembers } from "@halaalvest/db"
import {
  createCsvResponse,
  getReportsDateFilters,
  requireReportsExportContext,
  toCsv,
} from "../export-utils"

type MemberListFilters = NonNullable<Parameters<typeof listMembers>[1]>
type MemberListResult = Awaited<ReturnType<typeof listMembers>>
type MemberRow = MemberListResult["items"][number]

async function listAllMembers(tenantId: string, filters: MemberListFilters) {
  const pageSize = 500
  const members: MemberRow[] = []
  let page = 1

  while (true) {
    const result = await listMembers(tenantId, {
      ...filters,
      page,
      pageSize,
    })

    members.push(...result.items)

    if (members.length >= result.total || result.items.length === 0) {
      return members
    }

    page += 1
  }
}

export async function GET(request: Request) {
  const context = await requireReportsExportContext()

  if (!context?.tenant) {
    return new Response("Unauthorized", { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const filters = getReportsDateFilters(
    Object.fromEntries(searchParams.entries())
  )
  const members = await listAllMembers(context.tenant.id, {
    joinedFrom: filters.fromDate,
    joinedTo: filters.toDate,
  })
  const csv = toCsv(
    [
      "Member Id",
      "Member Number",
      "Full Name",
      "Email",
      "Phone Number",
      "Address",
      "Occupation",
      "Member Type",
      "Status",
      "KYC Status",
      "Joined At",
      "Exited At",
      "Deduction Source",
      "Deduction Source Type",
      "Deduction Source Reference",
      "Total Savings Snapshot",
      "Payment Allocation Preference",
      "Linked Login",
      "Linked User Email",
      "KYC Document Type",
      "KYC Document Uploaded At",
      "KYC Review Notes",
      "Created At",
      "Updated At",
    ],
    members.map((member) => [
      member.id,
      member.memberNumber,
      member.fullName,
      member.email ?? "",
      member.phoneNumber ?? "",
      member.address ?? "",
      member.occupation ?? "",
      member.memberType,
      member.status,
      member.kycStatus,
      member.joinedAt.toISOString(),
      member.exitedAt?.toISOString() ?? "",
      member.deductionSource?.name ?? "",
      member.deductionSource?.type ?? "",
      member.deductionSource?.externalReference ?? "",
      Number(member.totalSavingsSnapshot),
      member.paymentAllocationPreference,
      Boolean(member.user),
      member.user?.email ?? "",
      member.kycDocumentType ?? "",
      member.kycDocumentUploadedAt?.toISOString() ?? "",
      member.kycReviewNotes ?? "",
      member.createdAt.toISOString(),
      member.updatedAt.toISOString(),
    ])
  )

  return createCsvResponse(`${context.tenant.slug}-members-register.csv`, csv)
}
