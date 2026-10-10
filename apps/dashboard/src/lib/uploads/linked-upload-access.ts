import { createPrismaClient, type MembershipRole } from "@halaalvest/db"
import { allStaffRoles, financeManagementRoles } from "@/lib/workspace-access"
import type { DashboardUploadPurpose } from "./upload-policy"

type LinkedUploadMatches = {
  memberDocumentLinked?: boolean
  memberDocumentOwnerId?: string | null
  receiptLinked?: boolean
  receiptOwnerId?: string | null
  supportCaseMemberOwnerId?: string | null
  supportCaseOpenedById?: string | null
  supportMessageLinked?: boolean
  openingBalanceLinked: boolean
}

export function canReadLinkedDashboardUpload(
  role: MembershipRole, userId: string, purpose: DashboardUploadPurpose, matches: LinkedUploadMatches
) {
  const scoped: LinkedUploadMatches = {
    openingBalanceLinked: purpose === "opening_balance_source" && matches.openingBalanceLinked,
    memberDocumentLinked: purpose === "member_document" && matches.memberDocumentLinked,
    memberDocumentOwnerId: purpose === "member_document" ? matches.memberDocumentOwnerId : null,
    receiptLinked: purpose === "payment_receipt_proof" && matches.receiptLinked,
    receiptOwnerId: purpose === "payment_receipt_proof" ? matches.receiptOwnerId : null,
    supportMessageLinked: purpose === "support_attachment" && matches.supportMessageLinked,
    supportCaseMemberOwnerId: purpose === "support_attachment" ? matches.supportCaseMemberOwnerId : null,
    supportCaseOpenedById: purpose === "support_attachment" ? matches.supportCaseOpenedById : null,
  }
  if (allStaffRoles.includes(role)) {
    return Boolean(
      scoped.memberDocumentLinked || scoped.receiptLinked ||
      scoped.supportMessageLinked ||
      (scoped.openingBalanceLinked && financeManagementRoles.includes(role))
    )
  }
  if (role !== "member") return false
  return [
    scoped.memberDocumentOwnerId,
    scoped.receiptOwnerId,
    scoped.supportCaseMemberOwnerId,
    scoped.supportCaseOpenedById,
  ].includes(userId)
}

export async function hasLinkedDashboardUploadAccess({
  tenantId, userId, role, purpose, linkedEntityType, linkedEntityId, url,
}: {
  tenantId: string
  userId: string
  role: MembershipRole
  purpose: DashboardUploadPurpose
  linkedEntityType: string | null
  linkedEntityId: string | null
  url: string
}) {
  const expectedEntityType: Record<DashboardUploadPurpose, string> = {
    member_document: "MemberDocument",
    opening_balance_source: "MemberOpeningBalance",
    payment_receipt_proof: "MemberPaymentReceipt",
    support_attachment: "SupportCaseMessage",
  }
  if (!linkedEntityId || linkedEntityType !== expectedEntityType[purpose]) return false
  const db = createPrismaClient()
  if (!db) return false
  const [document, receipt, openingBalance, supportMessage] = await Promise.all([
    db.memberDocument.findFirst({
      where: { id: linkedEntityId, tenantId, documentUrl: url },
      select: { member: { select: { userId: true } } },
    }),
    db.memberPaymentReceipt.findFirst({
      where: { id: linkedEntityId, tenantId, proofDocumentUrl: url },
      select: { member: { select: { userId: true } } },
    }),
    db.memberOpeningBalance.findFirst({
      where: { id: linkedEntityId, tenantId, sourceDocumentUrl: url },
      select: { id: true },
    }),
    db.supportCaseMessage.findFirst({
      where: { id: linkedEntityId, tenantId, attachmentUrl: url },
      select: { supportCase: { select: { openedByUserId: true, member: { select: { userId: true } } } } },
    }),
  ])
  return canReadLinkedDashboardUpload(role, userId, purpose, {
    memberDocumentLinked: Boolean(document),
    memberDocumentOwnerId: document?.member.userId,
    receiptLinked: Boolean(receipt),
    receiptOwnerId: receipt?.member.userId,
    openingBalanceLinked: Boolean(openingBalance),
    supportCaseMemberOwnerId: supportMessage?.supportCase.member?.userId,
    supportCaseOpenedById: supportMessage?.supportCase.openedByUserId,
    supportMessageLinked: Boolean(supportMessage),
  })
}
