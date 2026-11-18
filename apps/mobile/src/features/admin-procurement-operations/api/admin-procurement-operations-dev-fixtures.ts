import type {
  ProcurementCommandResult,
  ProcurementLane,
  ProcurementOperation,
  ProcurementScheduleItem,
  ProcurementSummary,
  ProcurementWorkspace,
} from "../model/admin-procurement-operations-types"

const now = new Date()
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString()
const reviewer = { email: "finance@example.test", fullName: "Ibrahim Yusuf", id: "33333333-3333-4333-8333-333333333333" }

const people: [string, string][] = [
  ["Aisha Bello", "QHC-0042"],
  ["Khadija Sanni", "QHC-0118"],
  ["Musa Abdullahi", "QHC-0063"],
  ["Zainab Adamu", "QHC-0091"],
  ["Usman Bello", "QHC-0024"],
  ["Halima Musa", "QHC-0137"],
  ["Sadiq Lawal", "QHC-0149"],
  ["Fatima Garba", "QHC-0031"],
]
const items: [string, number, number, string][] = [
  ["Samsung refrigerator 350L", 480_000, 12, "Slot Systems, Kano"],
  ["Solar inverter 3.5kVA", 920_000, 18, "Sun King, Abuja"],
  ["Industrial sewing machine", 185_000, 6, "Butterfly Depot, Kaduna"],
  ["HP laptop 15-inch", 620_000, 10, "Slot Systems, Kano"],
  ["Chest freezer 300L", 310_000, 8, "Hisense Mart, Zaria"],
  ["Grinding machine", 260_000, 6, "Bako Engineering"],
]

function schedule(id: string, cost: number, months: number, overdue: number): ProcurementScheduleItem[] {
  const amount = Math.round(cost / months / 1000) * 1000
  return Array.from({ length: months }, (_, index) => {
    const due = new Date(now)
    due.setMonth(due.getMonth() + index - 2 - overdue)
    const paid = index < 2
    const late = !paid && index < 2 + overdue
    return {
      amount,
      dueDate: due.toISOString(),
      id: `${id}-s${index + 1}`,
      installmentNumber: index + 1,
      outstandingAmount: paid ? 0 : amount,
      paidAmount: paid ? amount : 0,
      status: paid ? "paid" : late ? "overdue" : "pending",
    }
  })
}

function make(index: number, lane: ProcurementLane, status: string, overdue = 0): ProcurementOperation {
  const [fullName, memberNumber] = people[index % people.length]!
  const [itemName, cost, months, vendorName] = items[index % items.length]!
  const id = `${String(index).padStart(8, "0")}-1111-4111-8111-111111111111`
  const approved = !["submitted", "under_review"].includes(status) && status !== "rejected"
  const active = lane === "servicing" || status === "completed"
  const scheduleItems = active ? schedule(id, cost, months, overdue) : []
  const outstanding = scheduleItems.reduce((sum, item) => sum + item.outstandingAmount, 0)
  return {
    approvedCost: approved ? cost : null,
    approvedMonthlyRepayment: approved ? Math.round(cost / months / 1000) * 1000 : null,
    approvedRepaymentMonths: approved ? months : null,
    createdAt: daysAgo(index + 1),
    id,
    itemDescription: "For the member’s shop.",
    itemName,
    lane,
    member: { email: null, fullName, id: `m-${index}`, memberNumber },
    nextDue: scheduleItems.find((item) => item.outstandingAmount > 0) ?? null,
    outstandingAmount: outstanding,
    overdueCount: overdue,
    policyMaximumPaybackMonths: 24,
    purchasedAt: active ? daysAgo(70) : null,
    purchaseNotes: active ? "Delivered and checked at the member’s shop." : null,
    purchaseReference: active ? `INV-${20_400 + index}` : null,
    repaymentScheduleItems: scheduleItems,
    requestedAt: daysAgo(index + 1),
    requestedCost: cost,
    requestedRepaymentMonths: months,
    reviewedAt: approved || status === "rejected" ? daysAgo(index) : null,
    reviewedByUser: approved || status === "rejected" ? reviewer : null,
    reviewNotes: status === "rejected" ? "Outside the member’s limit." : approved ? "Within policy." : null,
    status,
    vendorName,
  }
}

const requests: ProcurementOperation[] = [
  ...Array.from({ length: 12 }, (_, i) => make(i, "review", i % 3 === 1 ? "under_review" : "submitted")),
  ...[0, 1, 2].map((i) => make(20 + i, "activate", "approved")),
  ...Array.from({ length: 8 }, (_, i) => make(40 + i, "servicing", "active", [2, 1, 0, 0, 1][i] ?? 0)),
  ...[0, 1, 2].map((i) => make(70 + i, "completed", i === 1 ? "rejected" : "completed")),
]

let fixtureMode: "empty" | "error" | "normal" = "normal"
export function setDevProcurementFixtureMode(mode: typeof fixtureMode) {
  fixtureMode = mode
}

export async function getDevProcurementSummary(): Promise<ProcurementSummary> {
  return {
    activeRequests: 8,
    approvedRequests: 3,
    currencyCode: "NGN",
    dueScheduleItems: 6,
    generatedAt: now.toISOString(),
    outstandingAmount: 4_820_000,
    overdueScheduleItems: 4,
    pendingRequests: 12,
    rejectedRequests: 1,
    totalApprovedCost: 8_640_000,
    totalRequestedCost: 9_210_000,
    totalRequests: 26,
  }
}

export async function getDevProcurementWorkspace(input: {
  lane: ProcurementLane
  search?: string
}): Promise<ProcurementWorkspace> {
  if (fixtureMode === "error") throw new Error("Dev fixture: lane unavailable")
  const query = input.search?.trim().toLowerCase()
  const items =
    fixtureMode === "empty"
      ? []
      : requests.filter(
          (request) =>
            request.lane === input.lane &&
            (!query ||
              `${request.member.fullName} ${request.member.memberNumber} ${request.itemName}`
                .toLowerCase()
                .includes(query))
        )
  return {
    capabilities: { activate: true, review: true, submitPayment: true, view: true },
    currencyCode: "NGN",
    generatedAt: now.toISOString(),
    items,
    lane: input.lane,
    nextCursor: null,
    total: items.length,
  }
}

export async function getDevProcurementDetail(procurementRequestId?: string) {
  return requests.find((request) => request.id === procurementRequestId) ?? requests[0]!
}

export async function runDevProcurementCommand(
  commandId: string,
  entityId: string,
  state: string
): Promise<ProcurementCommandResult> {
  return { commandId, entityId, replayed: false, state }
}
