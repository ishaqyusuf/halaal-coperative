import { mobileDevQuickFill } from "@/dev/mobile-dev-quick-fill"
import {
  createMobileMemberFoodPurchaseApplication,
  getMobileMemberFoodPurchase,
  getMobileMemberFoodPurchaseApplication,
  getMobileMemberFoodPurchaseApplications,
  presentMemberFoodPurchaseForQa,
  type MobileFoodPurchaseApplication,
} from "@/features/food-purchase/public/member-food-purchase-requests"
import {
  createMobileMemberProcurementRequest,
  getMobileMemberProcurement,
  getMobileMemberProcurementRequest,
  getMobileMemberProcurementRequests,
  presentMemberProcurementForQa,
  type MobileMemberProcurementRequest,
} from "@/features/procurement/public/member-procurement-requests"
import {
  createMobileMemberProjectFinancingRequest,
  getMobileMemberProjectFinancing,
  getMobileMemberProjectFinancingChargeQuote,
  getMobileMemberProjectFinancingRequest,
  getMobileMemberProjectFinancingRequests,
  presentMemberProjectFinancingForQa,
  type MobileProjectFinancingRequest,
} from "@/features/project-financing/public/member-project-financing-requests"
import {
  formatServiceDate,
  getServiceStatus,
  structureLabels,
  type ServiceAdapter,
  type ServiceRequest,
} from "./service-request-model"

function procurementRow(row: MobileMemberProcurementRequest): ServiceRequest {
  return {
    amount: row.approvedCost ?? row.requestedCost,
    date: row.requestedAt,
    details: [
      ["Vendor", row.vendorName],
      ["Description", row.itemDescription],
      ["Purchase reference", row.purchaseReference],
      ["Purchased", row.purchasedAt && formatServiceDate(row.purchasedAt)],
    ],
    id: row.id,
    months: row.approvedRepaymentMonths ?? row.requestedRepaymentMonths,
    monthly: row.approvedMonthlyRepayment ?? row.estimatedMonthlyRepayment,
    outstanding: row.approvedCost === null ? null : row.outstandingAmount,
    paid: row.scheduleItems.reduce((total, item) => total + item.paidAmount, 0),
    repaymentTotal:
      row.approvedCost === null
        ? undefined
        : row.approvedCost + (row.approvedMarkup ?? 0),
    payments: row.scheduleItems.map((item) => ({
      amount: item.amount,
      date: item.dueDate,
      id: item.id,
      number: item.installmentNumber,
      paid: item.paidAmount,
      status: item.status,
    })),
    reviewNotes: row.reviewNotes,
    status: getServiceStatus(row.status),
    subtitle: row.vendorName,
    title: row.itemName,
  }
}

function projectRow(row: MobileProjectFinancingRequest): ServiceRequest {
  const structure = row.approvedStructure ?? row.proposedStructure
  const repayable = structure === "repayable_facility"
  return {
    amount: row.approvedAmount ?? row.requestedAmount,
    date: row.requestedAt,
    details: [
      ["Structure", structureLabels[structure].title],
      ["Purpose", row.projectPurpose],
      ["Business", row.businessDescription],
      ["Disbursement", row.disbursementReference],
      ["Disbursed", row.disbursedAt && formatServiceDate(row.disbursedAt)],
      ["Disbursement notes", row.disbursementNotes],
    ],
    id: row.id,
    months: repayable
      ? (row.approvedPaybackMonths ?? row.requestedPaybackMonths)
      : null,
    monthly: repayable
      ? (row.approvedMonthlyPayback ?? row.estimatedMonthlyPayback)
      : null,
    outstanding:
      repayable && row.approvedAmount !== null
        ? Math.max(row.approvedAmount - row.paidAmount, 0)
        : null,
    paid: row.paidAmount,
    reviewNotes: row.reviewNotes,
    status: getServiceStatus(row.status),
    subtitle: structureLabels[structure].title,
    title: row.businessName,
  }
}

function foodRow(row: MobileFoodPurchaseApplication): ServiceRequest {
  const title = `${formatServiceDate(row.cycle.periodMonth, true)} cycle`
  const amount = row.approvedAmount ?? row.requestedAmount
  const months = row.approvedPaybackMonths ?? row.requestedPaybackMonths
  let status = getServiceStatus(row.status)
  if (status === "approved" && row.approvedAmount !== null) {
    if (row.paidAmount >= row.approvedAmount) status = "completed"
    else if (
      row.goodsReleasedAt ||
      row.paidAmount > 0 ||
      ["accounting_approved", "completed", "closed"].includes(row.cycle.status)
    )
      status = "active"
  }
  return {
    amount,
    date: row.requestedAt,
    details: [
      ["Cycle", title],
      ["Items", row.itemDescription],
      ["Notes", row.requestNotes],
      [
        "Released",
        row.goodsReleasedAt ? formatServiceDate(row.goodsReleasedAt) : null,
      ],
    ],
    id: row.id,
    months,
    monthly: months > 0 ? amount / months : null,
    outstanding:
      row.approvedAmount === null ? null : Math.max(amount - row.paidAmount, 0),
    paid: row.paidAmount,
    reviewNotes: row.reviewNotes,
    status,
    subtitle: row.itemDescription,
    title,
  }
}

function mapPage<T>(
  page: { data: T[]; nextCursor: string | null; state: string },
  map: (row: T) => ServiceRequest
) {
  if (page.state !== "available")
    throw new Error("Couldn’t load more requests. Try again.")
  return { requests: page.data.map(map), nextCursor: page.nextCursor }
}

const procurementPreset = mobileDevQuickFill.procurement
const projectPreset = mobileDevQuickFill.projectFinancing
const foodPreset = mobileDevQuickFill.foodPurchase

export const procurementAdapter: ServiceAdapter = {
  kind: "procurement",
  async list(qa) {
    const src = presentMemberProcurementForQa(
      await getMobileMemberProcurement(),
      qa === "no-cycle" || qa === "quote-error" ? null : qa
    )
    return {
      activeRequest:
        qa !== "empty" && src.activeRequest
          ? procurementRow(src.activeRequest)
          : null,
      accessMode: src.capability.accessMode,
      activeCount: src.summary.activeRequests,
      cache: src.cache,
      canCreate: src.canCreateRequest,
      chargeOptions: src.chargeOptions,
      maxMonths: src.policy.maximumPaybackMonths,
      nextCursor: src.requestNextCursor,
      pendingCount: src.summary.pendingRequests,
      reasons: src.restrictionReasons,
      requests: src.requests.map(procurementRow),
      state: src.state,
      totalCount: src.summary.totalRequests,
    }
  },
  async page(input) {
    return mapPage(
      await getMobileMemberProcurementRequests(input),
      procurementRow
    )
  },
  async detail(id) {
    const row = await getMobileMemberProcurementRequest(id)
    return row && procurementRow(row)
  },
  async submit(draft) {
    return procurementRow(
      await createMobileMemberProcurementRequest({
        itemDescription: draft.notes.trim() || undefined,
        itemName: draft.name.trim(),
        requestedCost: Number(draft.amount),
        requestedRepaymentMonths: Number(draft.months),
        submissionKey: draft.submissionKey,
        vendorName: draft.secondary.trim() || undefined,
      })
    )
  },
  quickFill: {
    amount: procurementPreset.requestedCost,
    months: procurementPreset.requestedRepaymentMonths,
    name: procurementPreset.itemName,
    notes: procurementPreset.itemDescription,
    secondary: procurementPreset.vendorName,
  },
}

export const projectFinancingAdapter: ServiceAdapter = {
  kind: "project-financing",
  async list(qa) {
    const src = presentMemberProjectFinancingForQa(
      await getMobileMemberProjectFinancing(),
      qa === "no-cycle" || qa === "quote-error" ? null : qa
    )
    return {
      activeRequest:
        qa !== "empty" && src.activeRequest
          ? projectRow(src.activeRequest)
          : null,
      activeCount: src.summary.activeRequests,
      cache: src.cache,
      canCreate: src.canCreateRequest,
      chargeOptions: src.chargeOptions,
      nextCursor: src.requestNextCursor,
      pendingCount: src.summary.pendingRequests,
      reasons: src.restrictionReasons,
      requests: src.requests.map(projectRow),
      state: src.state,
      structures: src.eligibleStructures,
      totalCount: src.summary.totalRequests,
    }
  },
  async page(input) {
    return mapPage(
      await getMobileMemberProjectFinancingRequests(input),
      projectRow
    )
  },
  async detail(id) {
    const row = await getMobileMemberProjectFinancingRequest(id)
    return row && projectRow(row)
  },
  quote: getMobileMemberProjectFinancingChargeQuote,
  async submit(draft, quote) {
    if (quote?.requestedAmount !== Number(draft.amount))
      throw new Error("Review a current quote before submitting.")
    return projectRow(
      await createMobileMemberProjectFinancingRequest({
        businessDescription: draft.notes.trim() || undefined,
        businessName: draft.name.trim(),
        chargeQuoteHash: quote.chargeQuoteHash,
        projectPurpose: draft.secondary.trim() || undefined,
        proposedStructure: draft.structure,
        requestedAmount: Number(draft.amount),
        requestedPaybackMonths:
          draft.structure === "repayable_facility"
            ? Number(draft.months)
            : undefined,
        submissionKey: draft.submissionKey,
      })
    )
  },
  quickFill: {
    amount: projectPreset.requestedAmount,
    months: projectPreset.requestedPaybackMonths,
    name: projectPreset.businessName,
    notes: projectPreset.businessDescription,
    secondary: projectPreset.projectPurpose,
    structure: "repayable_facility",
  },
}

export const foodPurchaseAdapter: ServiceAdapter = {
  kind: "food-purchase",
  async list(qa) {
    const src = presentMemberFoodPurchaseForQa(
      await getMobileMemberFoodPurchase(),
      qa === "no-cycle" || qa === "quote-error" ? null : qa
    )
    const cycles =
      qa === "no-cycle"
        ? []
        : src.cycles
            .filter((cycle) => cycle.status === "open")
            .map((cycle) => ({
              id: cycle.id,
              label: `${formatServiceDate(cycle.periodMonth, true)} cycle`,
            }))
    return {
      activeRequest:
        qa !== "empty" && src.activeRequest ? foodRow(src.activeRequest) : null,
      accessMode: src.capability.accessMode,
      cache: src.cache,
      canCreate: src.canCreateApplication && cycles.length > 0,
      chargeOptions: src.chargeOptions,
      cycles,
      maxMonths: src.policy.maximumPaybackMonths,
      nextCursor: src.applicationNextCursor,
      pendingCount: src.summary.pendingApplications,
      reasons: src.restrictionReasons,
      requests: src.applications.map(foodRow),
      state: src.state,
      totalCount: src.summary.totalApplications,
    }
  },
  async page(input) {
    return mapPage(
      await getMobileMemberFoodPurchaseApplications(input),
      foodRow
    )
  },
  async detail(id) {
    const row = await getMobileMemberFoodPurchaseApplication(id)
    return row && foodRow(row)
  },
  async submit(draft) {
    return foodRow(
      await createMobileMemberFoodPurchaseApplication({
        cycleId: draft.cycleId,
        itemDescription: draft.secondary.trim() || undefined,
        requestedAmount: Number(draft.amount),
        requestedPaybackMonths: Number(draft.months),
        requestNotes: draft.notes.trim() || undefined,
        submissionKey: draft.submissionKey,
      })
    )
  },
  quickFill: {
    amount: foodPreset.requestedAmount,
    months: foodPreset.requestedPaybackMonths,
    notes: foodPreset.requestNotes,
    secondary: foodPreset.itemDescription,
  },
}
