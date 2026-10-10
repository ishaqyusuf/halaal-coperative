import type {
  RepaymentCommandResult,
  RepaymentFacility,
  RepaymentLane,
  RepaymentWorkspace,
  RepaymentWorkspaceItem,
} from "../model/admin-repayment-operations-types"

const now = new Date()
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

const postedItems: RepaymentWorkspaceItem[] = [
  {
    ...dueItems[0]!,
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
  const source =
    input.lane === "posted"
      ? postedItems
      : input.lane === "collections"
        ? dueItems.filter((item) => item.agingDays > 0)
        : dueItems
  const query = input.search?.trim().toLowerCase()
  const items = query
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
    summary: {
      activeFacilities: 11,
      dueThisMonth: 520_000,
      outstanding: 2_840_000,
      overdue: 300_000,
      paidPrincipal: 1_160_000,
      principal: 4_000_000,
    },
  }
}

export async function getDevRepaymentFacility(
  loanId: string
): Promise<RepaymentFacility> {
  const item = dueItems.find((row) => row.loan.id === loanId) ?? dueItems[0]!
  return {
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
    paidPrincipal: 100_000,
    principalAmount: item.loan.outstandingPrincipal + 100_000,
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
    schedule: Array.from({ length: 4 }, (_, index) => ({
      agingDays: index === 0 ? item.agingDays : 0,
      amountPaid: index === 0 ? 0 : 25_000,
      dueAt: isoDaysFromNow((index - 1) * 30),
      id: index === 0 ? item.id : `55555555-5555-4555-8555-55555555555${index}`,
      installmentNumber: index + 1,
      outstandingAmount: index === 0 ? item.amount : 0,
      state: index === 0 ? item.state : "paid",
      totalDue: 25_000,
    })),
    state: item.loan.status,
    termMonths: 12,
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
