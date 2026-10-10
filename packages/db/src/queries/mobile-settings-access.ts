import {
  getMobileMemberFoodPurchaseService,
  getMobileMemberProcurementService,
  getMobileMemberProjectFinancingService,
} from "./mobile-member-cooperative-services"
import { getMobileMemberGuarantorSnapshot } from "./mobile-member-guarantors"
import { getMobileMemberReceiptSnapshot } from "./mobile-member-receipts"
import { getMobileMemberStatementSnapshot } from "./mobile-member-statement"
import { getMobileMemberSupportSnapshot } from "./mobile-member-support"

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
  const [statement, receipts, procurement, project, food, guarantors, support] =
    await Promise.all([
      getMobileMemberStatementSnapshot(input),
      getMobileMemberReceiptSnapshot(input),
      getMobileMemberProcurementService(input),
      getMobileMemberProjectFinancingService(input),
      getMobileMemberFoodPurchaseService(input),
      getMobileMemberGuarantorSnapshot(input),
      getMobileMemberSupportSnapshot(input),
    ])

  if (!statement.member) return unavailableMore()

  const stat = (key: string) =>
    statement.stats.find((item) => item.key === key)?.value ?? 0
  const sections: MobileMemberMore["sections"] = [
    {
      icon: "UserRound",
      key: "profile",
      rows: [
        row({
          detail: `${humanize(statement.member.status) ?? "Member"} membership`,
          format: null,
          key: "member-number",
          label: statement.member.memberNumber,
          status: humanize(statement.member.kycStatus),
          value: null,
        }),
      ],
      title: "Profile",
    },
    {
      icon: "FileText",
      key: "statement",
      rows: [
        row({
          detail: "Generated from posted cooperative records",
          format: "currency",
          key: "savings",
          label: "Savings snapshot",
          status: "Available",
          value: stat("savings"),
        }),
        row({
          detail: "Current outstanding financing exposure",
          format: "currency",
          key: "financing",
          label: "Financing exposure",
          status: "Available",
          value: stat("outstanding-financing"),
        }),
      ],
      title: "Statement",
    },
    {
      icon: "ReceiptText",
      key: "receipts",
      rows: [
        row({
          detail: "Submitted or under finance review",
          format: "count",
          key: "pending-receipts",
          label: "Pending review",
          status: receipts.summary.pendingReviewReceipts > 0 ? "Open" : "Clear",
          value: receipts.summary.pendingReviewReceipts,
        }),
      ],
      title: "Receipts",
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
          status: procurement.summary.pendingRequests > 0 ? "Open" : "Clear",
          value: procurement.summary.pendingRequests,
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
          status: project.summary.pendingRequests > 0 ? "Open" : "Clear",
          value: project.summary.pendingRequests,
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
          status: food.summary.openCycles > 0 ? "Open" : "Closed",
          value: food.summary.openCycles,
        }),
        row({
          detail: "Applications waiting for committee review",
          format: "count",
          key: "pending-food-purchase",
          label: "Pending applications",
          status: food.summary.pendingApplications > 0 ? "Open" : "Clear",
          value: food.summary.pendingApplications,
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
          status:
            guarantors.summary.pendingApprovals > 0 ? "Needs action" : "Clear",
          value: guarantors.summary.pendingApprovals,
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
          status: support.summary.openCases > 0 ? "Open" : "Clear",
          value: support.summary.openCases,
        }),
      ],
      title: "Support",
    },
  ]

  return {
    generatedAt: new Date().toISOString(),
    member: {
      id: statement.member.id,
      kycStatus: statement.member.kycStatus,
      memberNumber: statement.member.memberNumber,
      name: statement.member.name,
      status: statement.member.status,
    },
    sections: sections.filter((section) => {
      if (section.key === "receipts") {
        return receipts.canCreateReceipt || receipts.receipts.length > 0
      }
      if (section.key === "procurement") {
        return (
          procurement.capability.shouldShowInMemberNav ||
          procurement.requests.length > 0
        )
      }
      if (section.key === "foodPurchase") {
        return (
          food.capability.shouldShowInMemberNav || food.applications.length > 0
        )
      }
      if (section.key === "support") {
        return support.canCreateCase || support.cases.length > 0
      }
      return true
    }),
  }
}
