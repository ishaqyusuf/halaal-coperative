import type {
  RepaymentCommandResult,
  RepaymentFacility,
  RepaymentLane,
  RepaymentSummary,
  RepaymentWorkspace,
  RepaymentWorkspaceItem,
} from "../model/admin-repayment-operations-types"

const now = new Date()

/** Dev-only switch for device QA of the empty and error lane states. */
let fixtureMode: "empty" | "error" | "normal" = "normal"
export function setDevRepaymentFixtureMode(mode: typeof fixtureMode) {
  fixtureMode = mode
}
const isoDaysFromNow = (days: number) => {
  const value = new Date(now)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString()
}

const dueItems: RepaymentWorkspaceItem[] = [
  {
    agingDays: 12,
    amount: 25_000,
    dueAt: isoDaysFromNow(-12),
    id: "11111111-1111-4111-8111-111111111111",
    installmentNumber: 1,
    lane: "due",
    latestFollowUp: {
      nextActionAt: isoDaysFromNow(1),
      priority: "high",
      status: "reminded",
    },
    loan: {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      outstandingPrincipal: 300_000,
      productName: "Normal financing",
      status: "active",
    },
    member: {
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      name: "Khadija Musa",
      number: "HV-1021",
    },
    reference: null,
    state: "overdue",
  },
  {
    agingDays: 0,
    amount: 20_000,
    dueAt: isoDaysFromNow(0),
    id: "22222222-2222-4222-8222-222222222222",
    installmentNumber: 2,
    lane: "due",
    latestFollowUp: null,
    loan: {
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      outstandingPrincipal: 40_000,
      productName: "Quick financing",
      status: "active",
    },
    member: {
      id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      name: "Fatima Lawal",
      number: "HV-1038",
    },
    reference: null,
    state: "due",
  },
]

// Enough rows for the floating search (more than 10) and grouped sections.
const extraMembers: [string, string, number][] = [
  ["Halima Garba", "QHC-0311", 41],
  ["Musa Abdullahi", "QHC-0187", 33],
  ["Bashir Aliyu", "QHC-0254", 19],
  ["Aisha Bello", "QHC-0042", 6],
  ["Ibrahim Yusuf", "QHC-0007", 0],
  ["Idris Bello", "QHC-0071", -2],
  ["Hadiza Umar", "QHC-0316", -5],
  ["Khadija Sanni", "QHC-0115", -9],
  ["Usman Danjuma", "QHC-0245", -14],
  ["Safiya Mustapha", "QHC-0182", -21],
]
dueItems.push(
  ...extraMembers.map(([name, number, aging], index) => {
    const suffix = String(index).padStart(2, "0")
    return {
      agingDays: Math.max(0, aging),
      amount: [37_500, 25_000, 12_500, 50_000][index % 4]!,
      dueAt: isoDaysFromNow(-aging),
      id: `66666666-6666-4666-8666-6666666666${suffix}`,
      installmentNumber: 2 + (index % 5),
      lane: "due" as const,
      latestFollowUp:
        index === 0
          ? { nextActionAt: isoDaysFromNow(1), priority: "high", status: "unreachable" }
          : index === 1
            ? { nextActionAt: isoDaysFromNow(3), priority: "high", status: "promise_to_pay" }
            : null,
      loan: {
        id: `77777777-7777-4777-8777-7777777777${suffix}`,
        outstandingPrincipal: 150_000 + index * 25_000,
        productName: index % 2 ? "Murabaha · Appliances" : "Qard hasan",
        status: "active",
      },
      member: {
        id: `88888888-8888-4888-8888-8888888888${suffix}`,
        name,
        number,
      },
      reference: null,
      state: aging > 0 ? "overdue" : aging === 0 ? "due" : "pending",
    }
  })
)
dueItems.sort((left, right) => left.dueAt.localeCompare(right.dueAt))

const postedItems: RepaymentWorkspaceItem[] = [
  {
    ...dueItems.find((item) => item.member.number === "HV-1021")!,
    agingDays: 0,
    amount: 25_000,
    dueAt: isoDaysFromNow(-1),
    id: "33333333-3333-4333-8333-333333333333",
    installmentNumber: null,
    lane: "posted",
    latestFollowUp: null,
    reference: "QA-REP-001",
    state: "posted",
  },
]

export async function getDevRepaymentWorkspace(input: {
  lane: RepaymentLane
  search?: string
}): Promise<RepaymentWorkspace> {
  if (fixtureMode === "error") throw new Error("Dev fixture: lane unavailable")
  const source =
    input.lane === "posted"
      ? postedItems
      : input.lane === "collections"
        ? dueItems.filter((item) => item.agingDays > 0)
        : dueItems
  const query = input.search?.trim().toLowerCase()
  const items = fixtureMode === "empty" ? [] : query
    ? source.filter((item) =>
        [item.member.name, item.member.number, item.loan.productName]
          .join(" ")
          .toLowerCase()
          .includes(query)
      )
    : source
  return {
    capabilities: { followUp: true, post: true, view: true },
    currencyCode: "NGN",
    generatedAt: now.toISOString(),
    items,
    lane: input.lane,
    nextCursor: null,
  }
}

export async function getDevRepaymentSummary(): Promise<RepaymentSummary> {
  const overdue = dueItems.filter((item) => item.agingDays > 0)
  return {
    activeFacilities: 37,
    counts: {
      collections: overdue.length,
      due: dueItems.length,
      posted: postedItems.length,
    },
    currencyCode: "NGN",
    dueThisMonth: 612_500,
    generatedAt: now.toISOString(),
    outstanding: 4_820_000,
    overdue: overdue.reduce((sum, item) => sum + item.amount, 0),
    paidPrincipal: 2_310_000,
    principal: 7_130_000,
  }
}

export async function getDevRepaymentFacility(
  loanId: string
): Promise<RepaymentFacility> {
  const item = dueItems.find((row) => row.loan.id === loanId) ?? dueItems[0]!
  return {
    counts: { followUps: 1, repayments: 1 },
    collectionFollowUps: [
      {
        actorName: "Ishaq Yusuf",
        assignedToName: null,
        caseStage: "active",
        createdAt: isoDaysFromNow(-1),
        id: "44444444-4444-4444-8444-444444444444",
        installmentNumber: item.installmentNumber ?? 1,
        nextActionAt: isoDaysFromNow(1),
        note: "Reminder sent. Member requested one business day to confirm transfer.",
        priority: "high",
        promiseToPayAt: isoDaysFromNow(1),
        resolutionStatus: "open",
        status: "promise_to_pay",
      },
    ],
    id: item.loan.id,
    member: item.member,
    nextDue: {
      agingDays: item.agingDays,
      amountPaid: 0,
      dueAt: item.dueAt,
      id: item.id,
      installmentNumber: item.installmentNumber ?? 1,
      outstandingAmount: item.amount,
      state: item.state,
      totalDue: item.amount,
    },
    outstandingPrincipal: item.loan.outstandingPrincipal,
    paidPrincipal: ((item.installmentNumber ?? 1) - 1) * item.amount,
    principalAmount:
      item.loan.outstandingPrincipal +
      ((item.installmentNumber ?? 1) - 1) * item.amount,
    productName: item.loan.productName,
    repayments: [
      {
        amount: 25_000,
        id: postedItems[0]!.id,
        paidAt: postedItems[0]!.dueAt,
        receivedByName: "Ishaq Yusuf",
        reference: "QA-REP-001",
        status: "posted",
      },
    ],
    schedule: Array.from({ length: 6 }, (_, index) => {
      const number = index + 1
      const current = item.installmentNumber ?? 1
      const offset = number - current
      return {
        agingDays: offset === 0 ? item.agingDays : 0,
        amountPaid: offset < 0 ? item.amount : 0,
        dueAt:
          offset === 0
            ? item.dueAt
            : isoDaysFromNow(
                offset < 0
                  ? offset * 30 - item.agingDays
                  : Math.max(offset * 30 - item.agingDays, offset * 9)
              ),
        id:
          offset === 0
            ? item.id
            : `55555555-5555-4555-8555-55555555555${index}`,
        installmentNumber: number,
        outstandingAmount: offset < 0 ? 0 : item.amount,
        state: offset < 0 ? "paid" : offset === 0 ? item.state : "pending",
        totalDue: item.amount,
      }
    }),
    state: item.loan.status,
    termMonths: 6,
    updatedAt: now.toISOString(),
  }
}

export async function runDevRepaymentCommand(
  commandId: string,
  entityId: string,
  state: string
): Promise<RepaymentCommandResult> {
  return { commandId, entityId, replayed: false, state }
}
