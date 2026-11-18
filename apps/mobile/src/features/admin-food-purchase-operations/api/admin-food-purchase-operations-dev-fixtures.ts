import type {
  FoodPurchaseApplication,
  FoodPurchaseApplicationPage,
  FoodPurchaseCommandResult,
  FoodPurchaseCycle,
  FoodPurchaseCycleStatus,
  FoodPurchaseWorkspace,
} from "../model/admin-food-purchase-operations-types"

const now = new Date()
const iso = now.toISOString()
const staff = { fullName: "Ibrahim Yusuf", id: "55555555-5555-4555-8555-555555555555" }
const capabilities = {
  releaseFunds: true,
  reviewAccounting: true,
  reviewApplications: true,
  submitAccounting: true,
  view: true,
}

function monthStart(offset: number) {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1, 12))
  return date.toISOString()
}

function cycle(
  offset: number,
  status: FoodPurchaseCycleStatus,
  released: number,
  figures?: { cost: number; opex: number; sales: number }
): FoodPurchaseCycle {
  const profit = figures ? figures.sales - figures.cost - figures.opex : null
  return {
    accountingNotes: figures ? "Committee figures reconciled." : null,
    accountingSubmittedAt: figures ? iso : null,
    accountingSubmittedByUser: figures ? staff : null,
    accountingSubmittedByUserId: figures ? staff.id : null,
    createdAt: monthStart(offset),
    id: `44444444-4444-4444-8444-4444444444${String(20 + offset).padStart(2, "0")}`,
    operatingExpenseAmount: figures?.opex ?? null,
    periodMonth: monthStart(offset),
    profitAmount: profit,
    purchaseCostAmount: figures?.cost ?? null,
    releasedAmount: released,
    releasedAt: monthStart(offset),
    releasedByUser: staff,
    releasedByUserId: staff.id,
    releaseNotes: "Approved at the committee meeting.",
    salesAmount: figures?.sales ?? null,
    status,
    updatedAt: iso,
  }
}

const cycles: FoodPurchaseCycle[] = [
  cycle(0, "open", 3_000_000),
  cycle(-1, "intake_closed", 2_500_000),
  cycle(-2, "accounting_submitted", 2_200_000, { cost: 2_140_000, opex: 96_000, sales: 2_610_000 }),
  cycle(-3, "accounting_approved", 2_000_000, { cost: 1_960_000, opex: 88_000, sales: 2_380_000 }),
  cycle(-4, "completed", 1_800_000, { cost: 1_520_000, opex: 70_000, sales: 1_776_000 }),
  cycle(-5, "completed", 1_800_000, { cost: 1_560_000, opex: 72_000, sales: 1_784_000 }),
  cycle(-6, "cancelled", 1_500_000),
]

const people: [string, string][] = [
  ["Aisha Bello", "QHC-0042"],
  ["Khadija Sanni", "QHC-0118"],
  ["Ibrahim Yusuf", "QHC-0007"],
  ["Musa Abdullahi", "QHC-0063"],
  ["Zainab Adamu", "QHC-0091"],
  ["Usman Bello", "QHC-0024"],
  ["Halima Musa", "QHC-0137"],
  ["Maryam Ibrahim", "QHC-0102"],
]
const baskets: [string, number, number][] = [
  ["Rice 50kg ×2 · Vegetable oil 25L", 128_000, 3],
  ["Garri 50kg · Beans 25kg", 64_000, 2],
  ["Rice 50kg · Spaghetti carton", 86_000, 3],
  ["Semovita 10kg ×3 · Sugar 10kg", 52_000, 2],
  ["Rice 50kg ×3", 165_000, 4],
  ["Vegetable oil 25L ×2", 96_000, 3],
]
const statuses: FoodPurchaseApplication["status"][] = [
  "submitted", "under_review", "submitted", "approved", "submitted", "rejected",
  "submitted", "under_review", "approved", "submitted", "approved", "submitted",
]
const current = cycles[0]!
const applications: FoodPurchaseApplication[] = statuses.map((status, index) => {
  const [fullName, memberNumber] = people[index % people.length]!
  const [items, amount, months] = baskets[index % baskets.length]!
  const approved = status === "approved"
  return {
    allowsCommitmentReductionDuringPayback: false,
    approvedAmount: approved ? amount : null,
    approvedPaybackMonths: approved ? months : null,
    cycle: { id: current.id, periodMonth: current.periodMonth, releasedAmount: current.releasedAmount, status: current.status },
    cycleId: current.id,
    id: `66666666-6666-4666-8666-6666666666${String(index).padStart(2, "0")}`,
    itemDescription: items,
    member: { fullName, id: `m-${index}`, memberNumber },
    outstandingAmount: approved ? amount : 0,
    paidAmount: 0,
    paidAt: null,
    policyMaximumPaybackMonths: 4,
    requestedAmount: amount,
    requestedAt: new Date(now.getTime() - index * 86_400_000).toISOString(),
    requestedPaybackMonths: months,
    requestNotes: "Monthly household stock.",
    reviewedAt: approved || status === "rejected" ? iso : null,
    reviewNotes: status === "rejected" ? "Outside the member’s limit." : approved ? "Within cycle capacity." : null,
    status,
  }
})

let fixtureMode: "empty" | "error" | "normal" = "normal"
export function setDevFoodPurchaseFixtureMode(mode: typeof fixtureMode) {
  fixtureMode = mode
}

export async function getDevFoodPurchaseOverview(cycleId?: string): Promise<FoodPurchaseWorkspace> {
  const selected = cycles.find((item) => item.id === cycleId) ?? current
  const inCycle = applications.filter((item) => item.cycleId === selected.id)
  const approved = inCycle.reduce((sum, item) => sum + (item.approvedAmount ?? 0), 0)
  const requested = inCycle.reduce((sum, item) => sum + item.requestedAmount, 0)
  return {
    applications: [],
    capabilities,
    currencyCode: "NGN",
    cycles,
    generatedAt: iso,
    lane: "accounting",
    nextApplicationCursor: null,
    selectedCycle: selected,
    summary: {
      allocationShortfallAmount: Math.max(0, approved - selected.releasedAmount),
      approvedAmount: approved,
      availableAmount: Math.max(0, selected.releasedAmount - approved),
      outstandingAmount: approved,
      paidAmount: 0,
      pendingApplications: inCycle.filter((item) => ["submitted", "under_review"].includes(item.status)).length,
      requestedAmount: requested,
      totalApplications: inCycle.length,
    },
  }
}

export async function getDevFoodPurchaseApplicationPage(input: {
  cycleId: string
  search?: string
}): Promise<FoodPurchaseApplicationPage> {
  if (fixtureMode === "error") throw new Error("Dev fixture: lane unavailable")
  const query = input.search?.trim().toLowerCase()
  const items =
    fixtureMode === "empty"
      ? []
      : applications.filter(
          (item) =>
            item.cycleId === input.cycleId &&
            (!query ||
              `${item.member.fullName} ${item.member.memberNumber} ${item.itemDescription}`
                .toLowerCase()
                .includes(query))
        )
  return {
    applications: items,
    capabilities,
    currencyCode: "NGN",
    generatedAt: iso,
    lane: "applications",
    nextApplicationCursor: null,
    nextCursor: null,
    total: items.length,
  }
}

export async function getDevFoodPurchaseApplicationDetail(id: string) {
  return applications.find((item) => item.id === id) ?? applications[0]!
}

export async function runDevFoodPurchaseCommand(
  commandId: string,
  entityId: string,
  state: string
): Promise<FoodPurchaseCommandResult> {
  return { commandId, entityId, replayed: false, state }
}
