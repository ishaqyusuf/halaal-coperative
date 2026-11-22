import { describe, expect, test } from "bun:test"
import type { MobileMemberPayable } from "./member-receipt-types"
import {
  createAllocations,
  koboFromInput,
  liveSelection,
  paymentPlan,
  preselectedPayable,
} from "./payment-plan"

const payable = (
  kind: MobileMemberPayable["kind"],
  targetId: string,
  amount: number
): MobileMemberPayable => ({
  amount,
  dueDate: "2026-11-30",
  id: `${kind}:${targetId}`,
  kind,
  overdue: false,
  subtitle: null,
  targetId,
  title: kind,
})

const owed = [
  payable("procurement", "schedule-3", 72500),
  payable("food_purchase", "food-1", 48000),
  payable("loan", "loan-1", 60000),
  payable("commitment", "plan-1", 25000),
]

describe("paymentPlan", () => {
  test("picked badges add up and Add more goes to savings", () => {
    const plan = paymentPlan({
      extra: "15,000",
      payables: owed,
      selected: ["procurement:schedule-3", "commitment:plan-1"],
      typed: "999",
    })
    expect(plan.mode).toBe("picked")
    expect(plan.total).toBe(11_250_000)
    expect(plan.lines.map((line) => [line.kind, line.amount])).toEqual([
      ["procurement", 7_250_000],
      ["commitment", 2_500_000],
      ["savings", 1_500_000],
    ])
  })

  test("a typed amount is applied in order, partial last, rest to savings", () => {
    expect(
      paymentPlan({ extra: "", payables: owed, selected: [], typed: "100000" })
        .lines.map((line) => [line.kind, line.amount / 100])
    ).toEqual([
      ["procurement", 72500],
      ["food_purchase", 27500],
    ])
    expect(
      paymentPlan({ extra: "", payables: owed, selected: [], typed: "230000" })
        .lines.at(-1)
    ).toMatchObject({ amount: 2_450_000, kind: "savings" })
  })

  test("nothing owed puts it all in savings", () => {
    expect(
      paymentPlan({ extra: "", payables: [], selected: [], typed: "30000" })
        .lines
    ).toEqual([{ amount: 3_000_000, kind: "savings", payable: null }])
  })
})

describe("deep link and selection", () => {
  test("preselects a current payable and ignores unknown or paid ones", () => {
    expect(preselectedPayable("food_purchase:food-1", owed)).toBe(
      "food_purchase:food-1"
    )
    expect(preselectedPayable(["procurement:old"], owed)).toBeNull()
    expect(preselectedPayable(undefined, owed)).toBeNull()
  })

  test("drops selections that are no longer payable", () => {
    expect(liveSelection(["loan:loan-1", "loan:gone"], owed)).toEqual([
      "loan:loan-1",
    ])
  })
})

describe("createAllocations", () => {
  test("automatic mode sends no split", () => {
    const plan = paymentPlan({
      extra: "",
      payables: owed,
      selected: [],
      typed: "5000",
    })
    expect(createAllocations(plan, "2026-11-22")).toEqual([])
  })

  test("picked badges become targeted allocations", () => {
    const plan = paymentPlan({
      extra: "500.5",
      payables: [...owed, payable("shares", "share-app-1", 50000)],
      selected: ["loan:loan-1", "shares:share-app-1"],
      typed: "",
    })
    expect(createAllocations(plan, "2026-11-22")).toEqual([
      {
        amount: 60000,
        category: "loan_servicing",
        loanId: "loan-1",
        periodIntent: "current_period",
        targetPeriodStart: "2026-11-01T00:00:00.000Z",
      },
      {
        amount: 50000,
        category: "shares",
        memberShareApplicationId: "share-app-1",
      },
      {
        amount: 500.5,
        category: "special_savings",
        periodIntent: "current_period",
        targetPeriodStart: "2026-11-01T00:00:00.000Z",
      },
    ])
  })

  test("reads typed money", () => {
    expect(koboFromInput("12,500.5")).toBe(1_250_050)
    expect(koboFromInput("")).toBe(0)
    expect(koboFromInput("-4")).toBe(0)
  })
})
