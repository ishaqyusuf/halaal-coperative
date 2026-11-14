import type {
  AssistantActionResult,
  AssistantAnswer,
  AssistantMessage,
  AssistantProposal,
} from "./contracts"
import { money } from "./format"

/**
 * Synthetic W0–W2 fixtures for UI and channel renderers. Not real data; never
 * import from server code paths that return to users.
 */
const asOf = "2026-11-14T09:00:00.000Z"

export const fixtureAnswers = {
  financingStatus: {
    kind: "financing-status",
    asOf,
    requests: [
      {
        id: "lr_1",
        reference: "FIN-2041",
        label: "Murabaha financing",
        amount: money(200000),
        stage: "Waiting for guarantor",
      },
    ],
    active: [
      {
        id: "ln_1",
        reference: "FIN-1877",
        label: "Laptop financing",
        principal: money(150000),
        remaining: money(62500),
        status: "repaying",
        nextDue: { date: "2026-11-30", amount: money(12500) },
      },
    ],
    link: { label: "Open financing", href: "/member/financing" },
  },
  investments: {
    kind: "investments",
    asOf,
    regularSavings: money(184000),
    specialSavings: money(45000),
    shareCapital: money(50000),
    shareUnits: 50,
    publishedProfit: money(7350),
    basis: "From your statement. Pending receipts are not included.",
    link: { label: "Open statement", href: "/member/statement" },
  },
  receipts: {
    kind: "receipts",
    asOf,
    items: [
      {
        id: "rc_1",
        reference: "RCPT-102",
        amount: money(25000),
        submittedAt: "2026-11-12T10:00:00.000Z",
        status: "submitted",
        reason: null,
        link: { label: "Open receipt", href: "/member/receipts/rc_1" },
      },
      {
        id: "rc_2",
        reference: "RCPT-097",
        amount: money(20000),
        submittedAt: "2026-10-30T10:00:00.000Z",
        status: "approved",
        reason: null,
        link: { label: "Open receipt", href: "/member/receipts/rc_2" },
      },
    ],
    nextCursor: null,
    link: { label: "All receipts", href: "/member/receipts" },
  },
  memberMatches: {
    kind: "member-matches",
    query: "Aisha",
    items: [
      {
        memberId: "m_1",
        memberNumber: "HV-1048",
        name: "Aisha Bello",
        hint: "Ministry of Works",
        link: { label: "Open member", href: "/members?memberId=m_1" },
      },
      {
        memberId: "m_2",
        memberNumber: "HV-1203",
        name: "Aisha Bello-Umar",
        hint: "Federal Medical Centre",
        link: { label: "Open member", href: "/members?memberId=m_2" },
      },
    ],
    truncated: false,
  },
  receiptQueue: {
    kind: "receipt-queue",
    asOf,
    pendingCount: 4,
    correctionCount: 1,
    items: [
      {
        id: "rc_9",
        reference: "RCPT-109",
        memberName: "Aisha Bello",
        memberNumber: "HV-1048",
        amount: money(25000),
        submittedAt: "2026-11-13T08:00:00.000Z",
        status: "submitted",
        link: { label: "Review", href: "/payment-receipts?receiptId=rc_9" },
      },
    ],
    nextCursor: null,
    link: { label: "Open receipt queue", href: "/payment-receipts" },
  },
  empty: {
    kind: "notice",
    tone: "empty",
    message: "You have no receipts yet.",
    link: null,
  },
  unavailable: {
    kind: "notice",
    tone: "unavailable",
    message: "Your statement could not be read right now. Try again shortly.",
    link: { label: "Open statement", href: "/member/statement" },
  },
} satisfies Record<string, AssistantAnswer>

export const fixtureProposal: AssistantProposal = {
  id: "pr_1",
  capabilityId: "M04",
  revision: 1,
  status: "review",
  fields: {
    kind: "receipt-submission",
    amount: money(25000),
    paidOn: "2026-11-12",
    paymentReference: "TRF-88123",
    allocations: [
      { targetId: "regular_savings", label: "Regular savings", amount: money(12500) },
      { targetId: "ln_1", label: "Laptop financing instalment", amount: money(12500) },
    ],
    evidenceUploadId: null,
  },
  missing: [],
  effect: "Saves a receipt for review. No money is posted until staff approve it.",
  expiresAt: "2026-11-14T10:00:00.000Z",
  confirmInApp: false,
}

export const fixtureResult: AssistantActionResult = {
  proposalId: "pr_1",
  revision: 1,
  outcome: "saved",
  reference: "RCPT-110",
  message: "Receipt RCPT-110 is saved for review.",
  link: { label: "Open receipt", href: "/member/receipts" },
}

export const fixtureConversation: AssistantMessage[] = [
  {
    id: "msg_1",
    role: "user",
    parts: [{ type: "text", text: "What are my total investments?" }],
    createdAt: asOf,
  },
  {
    id: "msg_2",
    role: "assistant",
    parts: [
      { type: "text", text: "Here is your position, kept separate by type." },
      { type: "answer", answer: fixtureAnswers.investments },
    ],
    createdAt: asOf,
  },
]
