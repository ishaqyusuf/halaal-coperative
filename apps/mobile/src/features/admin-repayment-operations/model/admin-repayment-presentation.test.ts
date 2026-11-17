import { describe, expect, test } from "bun:test"
import type {
  RepaymentFacility,
  RepaymentWorkspaceItem,
} from "./admin-repayment-operations-types"
import {
  dateOnlyFromNow,
  followUpCaseStage,
  followUpChip,
  groupLaneItems,
  rowSeverity,
  rowStatus,
  scheduleWindow,
  uniqueRows,
  validateFollowUpDraft,
  validateRepaymentDraft,
} from "./admin-repayment-presentation"

const now = new Date(2026, 10, 17, 10)

function row(
  overrides: Partial<RepaymentWorkspaceItem> & { daysFromNow?: number } = {}
): RepaymentWorkspaceItem {
  const { daysFromNow = 0, ...rest } = overrides
  const due = new Date(now)
  due.setDate(due.getDate() + daysFromNow)
  return {
    agingDays: Math.max(0, -daysFromNow),
    amount: 25_000,
    dueAt: due.toISOString(),
    id: `row-${daysFromNow}-${Math.random()}`,
    installmentNumber: 3,
    lane: "due",
    latestFollowUp: null,
    loan: {
      id: "loan-1",
      outstandingPrincipal: 300_000,
      productName: "Qard hasan",
      status: "active",
    },
    member: { id: "m-1", name: "Aisha Bello", number: "QHC-0042" },
    reference: null,
    state: "due",
    ...rest,
  }
}

describe("repayment lane presentation", () => {
  test("groups due rows by urgency and totals each group", () => {
    const groups = groupLaneItems(
      "due",
      [
        row({ daysFromNow: -12 }),
        row({ daysFromNow: -3 }),
        row({ daysFromNow: 0 }),
        row({ daysFromNow: 4 }),
        row({ daysFromNow: 20 }),
      ],
      now
    )
    expect(groups.map((group) => [group.title, group.count])).toEqual([
      ["Overdue", 2],
      ["Due today", 1],
      ["Next 7 days", 1],
      ["Later", 1],
    ])
    expect(groups[0]).toMatchObject({ attention: true, total: 50_000 })
  })

  test("buckets collections by days overdue", () => {
    const groups = groupLaneItems(
      "collections",
      [row({ daysFromNow: -41 }), row({ daysFromNow: -9 }), row({ daysFromNow: -2 })],
      now
    )
    expect(groups.map((group) => group.title)).toEqual([
      "30+ days overdue",
      "8–29 days overdue",
      "1–7 days overdue",
    ])
  })

  test("labels severity, status and follow-up chips", () => {
    const late = row({ daysFromNow: -5 })
    expect(rowSeverity(late)).toBe("bad")
    expect(rowStatus(late)).toEqual({ label: "5 days late", tone: "danger" })
    expect(rowStatus(row({ lane: "posted" }))).toEqual({
      label: "Posted",
      tone: "success",
    })
    expect(followUpChip(late, "collections")).toEqual({
      label: "No follow-up",
      tone: "warning",
    })
    expect(
      followUpChip(
        row({
          daysFromNow: -5,
          latestFollowUp: {
            nextActionAt: null,
            priority: "high",
            status: "promise_to_pay",
          },
        }),
        "due"
      )
    ).toMatchObject({ label: "Promise to pay", tone: "info" })
  })

  test("keeps the first copy of a row when pages overlap", () => {
    const first = row({ id: "same" } as never)
    expect(uniqueRows([first, { ...first, amount: 1 }])).toHaveLength(1)
  })
})

describe("repayment forms", () => {
  test("validates the amount against the outstanding balance", () => {
    const money = (value: number) => `₦${value}`
    expect(
      validateRepaymentDraft(
        { amount: "400000", paidAt: "2026-11-17", reference: "" },
        300_000,
        money
      )
    ).toEqual({
      amount: "Can’t be more than the ₦300000 outstanding.",
      reference: "Enter the payment reference.",
    })
    expect(
      validateRepaymentDraft(
        { amount: "25000", paidAt: "2026-11-17", reference: "TRF-1" },
        300_000,
        money
      )
    ).toEqual({})
  })

  test("needs notes, and a promise date for a promise to pay", () => {
    expect(
      validateFollowUpDraft({
        nextActionAt: "",
        note: "ok",
        priority: "normal",
        promiseToPayAt: "",
        status: "promise_to_pay",
      })
    ).toEqual({
      note: "Say what happened and what was agreed.",
      promiseToPayAt: "Add the date the member promised to pay.",
    })
  })

  test("maps outcomes to the server case stage", () => {
    expect(followUpCaseStage("settled", "high")).toBe("resolved")
    expect(followUpCaseStage("promise_to_pay", "low")).toBe("promise_tracking")
    expect(followUpCaseStage("reminded", "high")).toBe("escalated")
    expect(followUpCaseStage("unreachable", "normal")).toBe("active")
  })

  test("builds local date-only strings", () => {
    expect(dateOnlyFromNow(2, now)).toBe("2026-11-19")
  })
})

describe("facility schedule window", () => {
  test("shows two instalments either side of the next one", () => {
    const schedule = Array.from({ length: 12 }, (_, index) => ({
      agingDays: 0,
      amountPaid: 0,
      dueAt: "2026-11-17T00:00:00.000Z",
      id: `s${index + 1}`,
      installmentNumber: index + 1,
      outstandingAmount: 25_000,
      state: "pending",
      totalDue: 25_000,
    }))
    const facility = {
      nextDue: schedule[5],
      schedule,
    } as unknown as RepaymentFacility
    expect(
      scheduleWindow(facility, false).map((item) => item.installmentNumber)
    ).toEqual([4, 5, 6, 7, 8])
    expect(scheduleWindow(facility, true)).toHaveLength(12)
  })
})
