import { createPrismaClient } from "../prisma"
import { getFoodPurchaseApplicationSummary } from "./food-purchase"
import { getMemberByUserId } from "./members"
import { getTenantOperationProfile } from "./operation-profile"
import { getMemberReceiptSubmissionAccess } from "./payment-receipt-member-access"

type MobileMetricFormat = "count" | "currency" | "percent"
type MobileMemberMoreRow = {
  detail: string
  format: MobileMetricFormat | null
  key: string
  label: string
  status: string | null
  value: number | null
}

type MobileMemberMore = {
  generatedAt: string
  member: {
    id: string
    kycStatus: string
    memberNumber: string
    name: string
    status: string
  } | null
  sections: Array<{
    icon: string
    key:
      | "profile"
      | "statement"
      | "receipts"
      | "procurement"
      | "projectFinancing"
      | "foodPurchase"
      | "guarantors"
      | "support"
    rows: MobileMemberMoreRow[]
    title: string
  }>
}

function row(input: MobileMemberMoreRow) {
  return input
}

function humanize(value: string | null | undefined) {
  return value
    ? value
        .replace(/_/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : null
}

function unavailableMore(): MobileMemberMore {
  return {
    generatedAt: new Date().toISOString(),
    member: null,
    sections: [
      {
        icon: "UserRound",
        key: "profile",
        rows: [
          row({
            detail:
              "No linked member profile was found for this mobile session.",
            format: null,
            key: "member-profile",
            label: "Member profile needs linking",
            status: "Needs setup",
            value: null,
          }),
        ],
        title: "Profile",
      },
    ],
  }
}

export async function getMobileMemberMore(input: {
  tenantId: string
  userId: string
}): Promise<MobileMemberMore> {
  const prisma = createPrismaClient()
  if (!prisma) return unavailableMore()
  const member = await getMemberByUserId(input, prisma)
  if (!member) return unavailableMore()

  const scope = { tenantId: input.tenantId, memberId: member.id }
  const pending = ["submitted", "under_review"]
  const [
    profile,
    canSendReceipt,
    receiptGroups,
    procurementGroups,
    projectRequests,
    food,
    openCycles,
    pendingApprovals,
    supportGroups,
  ] = await Promise.all([
    getTenantOperationProfile(input.tenantId, prisma),
    getMemberReceiptSubmissionAccess(scope, prisma),
    prisma.memberPaymentReceipt.groupBy({
      by: ["status"],
      where: scope,
      _count: { _all: true },
    }),
    prisma.procurementRequest.groupBy({
      by: ["status"],
      where: scope,
      _count: { _all: true },
    }),
    prisma.projectFinancingRequest.count({
      where: { ...scope, status: { in: ["submitted", "under_review"] } },
    }),
    getFoodPurchaseApplicationSummary(scope, prisma),
    prisma.foodPurchaseCycle.count({
      where: { tenantId: input.tenantId, status: "open" },
    }),
    prisma.loanGuarantorApproval.count({
      where: {
        tenantId: input.tenantId,
        guarantorMemberId: member.id,
        status: "pending",
      },
    }),
    prisma.supportCase.groupBy({
      by: ["status"],
      where: scope,
      _count: { _all: true },
    }),
  ])
  const count = (
    groups: { status: string; _count: { _all: number } }[],
    statuses: string[]
  ) =>
    groups.reduce(
      (total, group) =>
        total + (statuses.includes(group.status) ? group._count._all : 0),
      0
    )
  const pendingReceipts = count(receiptGroups, pending)
  const pendingProcurement = count(procurementGroups, pending)
  const openCases = count(supportGroups, [
    "open",
    "in_progress",
    "waiting_on_member",
  ])

  const sections: MobileMemberMore["sections"] = [
    {
      icon: "UserRound",
      key: "profile",
      rows: [
        row({
          detail: `${humanize(member.status) ?? "Member"} membership`,
          format: null,
          key: "member-number",
          label: member.memberNumber,
          status: humanize(member.kycStatus),
          value: null,
        }),
      ],
      title: "Profile",
    },
    {
      icon: "FileText",
      key: "statement",
      rows: [],
      title: "Statement",
    },
    {
      icon: "ReceiptText",
      key: "receipts",
      rows: [
        row({
          detail: "Payments finance is still checking",
          format: "count",
          key: "pending-receipts",
          label: "Checking",
          status: pendingReceipts > 0 ? "Open" : "Clear",
          value: pendingReceipts,
        }),
      ],
      title: "Transactions",
    },
    {
      icon: "PackageSearch",
      key: "procurement",
      rows: [
        row({
          detail: "Requests waiting for cooperative review",
          format: "count",
          key: "pending-procurement",
          label: "Pending procurement",
          status: pendingProcurement > 0 ? "Open" : "Clear",
          value: pendingProcurement,
        }),
      ],
      title: "Procurement",
    },
    {
      icon: "BriefcaseBusiness",
      key: "projectFinancing",
      rows: [
        row({
          detail: "Requests waiting for finance review",
          format: "count",
          key: "pending-project-financing",
          label: "Pending project requests",
          status: projectRequests > 0 ? "Open" : "Clear",
          value: projectRequests,
        }),
      ],
      title: "Project financing",
    },
    {
      icon: "ShoppingBasket",
      key: "foodPurchase",
      rows: [
        row({
          detail: "Monthly cycles accepting applications",
          format: "count",
          key: "open-food-purchase-cycles",
          label: "Open cycles",
          status: openCycles > 0 ? "Open" : "Closed",
          value: openCycles,
        }),
        row({
          detail: "Applications waiting for committee review",
          format: "count",
          key: "pending-food-purchase",
          label: "Pending applications",
          status: food.pendingApplications > 0 ? "Open" : "Clear",
          value: food.pendingApplications,
        }),
      ],
      title: "Foodstuff Purchase",
    },
    {
      icon: "ShieldCheck",
      key: "guarantors",
      rows: [
        row({
          detail: "Requests waiting for your response",
          format: "count",
          key: "pending-guarantors",
          label: "Pending guarantor requests",
          status: pendingApprovals > 0 ? "Needs action" : "Clear",
          value: pendingApprovals,
        }),
      ],
      title: "Guarantor approvals",
    },
    {
      icon: "Headphones",
      key: "support",
      rows: [
        row({
          detail: "Open, in progress, or waiting on member",
          format: "count",
          key: "open-support",
          label: "Open cases",
          status: openCases > 0 ? "Open" : "Clear",
          value: openCases,
        }),
      ],
      title: "Support",
    },
  ]

  return {
    generatedAt: new Date().toISOString(),
    member: {
      id: member.id,
      kycStatus: member.kycStatus,
      memberNumber: member.memberNumber,
      name: member.fullName,
      status: member.status,
    },
    sections: sections.filter((section) => {
      if (section.key === "receipts") {
        return (
          canSendReceipt ||
          receiptGroups.length > 0
        )
      }
      if (section.key === "procurement") {
        return (
          profile.services.procurement.shouldShowInMemberNav ||
          procurementGroups.length > 0
        )
      }
      if (section.key === "foodPurchase") {
        return (
          profile.services.food_purchase.shouldShowInMemberNav ||
          food.totalApplications > 0
        )
      }
      if (section.key === "support") {
        return (
          profile.services.support_cases.canMemberCreate ||
          supportGroups.length > 0
        )
      }
      return true
    }),
  }
}
