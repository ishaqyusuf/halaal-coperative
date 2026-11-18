import { cooperativeMobileAccessTerms } from "@halaalvest/domain/cooperative-mobile-access"
import {
  estimatePlatformBill,
  platformBillingPrices,
} from "@halaalvest/domain/platform-billing"
import { formatNaira, publicPricingSummary } from "../pricing-data"

/*
 * Sample content for the homepage. Every person and figure is illustrative and
 * the page says so. Statements reconcile: brought forward + October
 * contribution = savings balance, and financing brought forward − repayment =
 * left to repay.
 */

export type HomepageNavLink = readonly [href: string, label: string]

export const homepageNavLinks: readonly HomepageNavLink[] = [
  ["#officers", "For officers"],
  ["#members", "For members"],
  ["#assistant", "AI assistant"],
  ["#pricing", "Pricing"],
]

export const seatFeeLabel = formatNaira(platformBillingPrices.seatFee)
export const assistantMessageLabel = formatNaira(
  platformBillingPrices.assistantMessagePrice
)
export const mobileAccessLabel = formatNaira(cooperativeMobileAccessTerms.amount)
export const mobileAccessMonths = cooperativeMobileAccessTerms.termMonths
export const assistantFreeMessages = platformBillingPrices.assistantFreeMessages

/** "₦437,000.00" for statement lines; "₦25,000" when `decimals` is false. */
export function formatAmount(amount: number, decimals = true) {
  return `₦${amount.toLocaleString("en-US", {
    maximumFractionDigits: decimals ? 2 : 0,
    minimumFractionDigits: decimals ? 2 : 0,
  })}`
}

export type HeroMemberKey =
  | "amina"
  | "maryam"
  | "musa"
  | "ibrahim"
  | "hauwa"
  | "zainab"
  | "yusuf"

type HeroFinancing = {
  broughtForward: number
  paymentNumber: string
  reference: string
  repayment: number
}

export type HeroMember = {
  broughtForward: number
  contribution: number
  /** Shown on wide screens only. */
  extra?: boolean
  financing: HeroFinancing | null
  /** A payroll line held for review instead of posted. */
  held: { deducted: number; expected: number } | null
  key: HeroMemberKey
  memberNumber: string
  name: string
}

export const heroMembers: readonly HeroMember[] = [
  {
    broughtForward: 412_000,
    contribution: 25_000,
    financing: {
      broughtForward: 480_000,
      paymentNumber: "3 of 18",
      reference: "FN-0192",
      repayment: 30_000,
    },
    held: null,
    key: "amina",
    memberNumber: "UNI-0418",
    name: "Amina Suleiman",
  },
  {
    broughtForward: 263_000,
    contribution: 25_000,
    financing: {
      broughtForward: 90_000,
      paymentNumber: "7 of 12",
      reference: "FN-0177",
      repayment: 15_000,
    },
    held: null,
    key: "maryam",
    memberNumber: "UNI-0287",
    name: "Maryam Lawal",
  },
  {
    broughtForward: 590_000,
    contribution: 20_000,
    financing: null,
    held: null,
    key: "musa",
    memberNumber: "UNI-0112",
    name: "Musa Bello",
  },
  {
    broughtForward: 205_000,
    contribution: 0,
    financing: null,
    held: { deducted: 35_000, expected: 45_000 },
    key: "ibrahim",
    memberNumber: "UNI-0391",
    name: "Ibrahim Yusuf",
  },
  {
    broughtForward: 118_500,
    contribution: 25_000,
    financing: null,
    held: null,
    key: "hauwa",
    memberNumber: "UNI-0533",
    name: "Hauwa Garba",
  },
  {
    broughtForward: 302_000,
    contribution: 25_000,
    extra: true,
    financing: {
      broughtForward: 160_000,
      paymentNumber: "5 of 12",
      reference: "FN-0185",
      repayment: 20_000,
    },
    held: null,
    key: "zainab",
    memberNumber: "UNI-0460",
    name: "Zainab Bako",
  },
  {
    broughtForward: 451_000,
    contribution: 30_000,
    extra: true,
    financing: null,
    held: null,
    key: "yusuf",
    memberNumber: "UNI-0144",
    name: "Yusuf Ahmed",
  },
]

/** Amount taken from the member's salary on the payroll line. */
export function payrollDeduction(member: HeroMember) {
  if (member.held) return member.held.deducted
  return member.contribution + (member.financing?.repayment ?? 0)
}

/** Savings balance at the end of October, as the member's statement shows it. */
export function savingsBalance(member: HeroMember) {
  return member.held ? member.broughtForward : member.broughtForward + member.contribution
}

export function financingLeft(financing: HeroFinancing) {
  return financing.broughtForward - financing.repayment
}

export const samplePayroll = {
  batch: "PD-2610",
  lines: 431,
  posted: 412,
  postedBy: "Ali Danjuma",
  postedOn: "25 Oct",
  held: 19,
} as const

export type AssistantStep =
  | { kind: "me"; text: string }
  | { kind: "bot"; card: AssistantCard }

export type AssistantCard = {
  confirm?: {
    cancelLabel: string
    cancelledText: string
    confirmLabel: string
    doneText: string
  }
  rows: readonly (readonly [label: string, value: string, tone?: "good"])[]
  subtitle: string
  title: string
}

export type AssistantConversation = {
  hint: string
  steps: readonly AssistantStep[]
  who: string
}

/** Capabilities M01, M04, S02 and S04 in .brain/features/cooperative-assistant.md. */
export const assistantConversations: Record<"member" | "staff", AssistantConversation> = {
  member: {
    hint: "Ask about savings, financing or receipts",
    steps: [
      { kind: "me", text: "How much is left on my financing?" },
      {
        card: {
          rows: [
            ["Left to repay", "₦450,000.00"],
            ["Next payment", "₦30,000 · November payroll"],
            ["Interest", "₦0.00", "good"],
          ],
          subtitle: "3 of 18 paid",
          title: "Financing FN-0192",
        },
        kind: "bot",
      },
      { kind: "me", text: "I paid ₦25,000 by transfer, ref TRF5521" },
      {
        card: {
          confirm: {
            cancelLabel: "Change",
            cancelledText: "Draft kept. Tell the assistant what to change.",
            confirmLabel: "Send for review",
            doneText:
              "Sent to your treasurer as receipt RC-2240. It posts once it is approved.",
          },
          rows: [
            ["Amount", "₦25,000.00"],
            ["Reference", "TRF5521"],
            ["Goes to", "Monthly savings · November"],
          ],
          subtitle: "Check before sending",
          title: "Receipt draft",
        },
        kind: "bot",
      },
    ],
    who: "Amina Suleiman · member · sample",
  },
  staff: {
    hint: "Ask about a member, receipts or a payment",
    steps: [
      { kind: "me", text: "Show Hauwa Garba’s balances" },
      {
        card: {
          rows: [
            ["Savings", "₦143,500.00"],
            ["Financing", "None"],
            ["Latest receipt", "RC-2231 · ₦25,000 · approved"],
          ],
          subtitle: "UNI-0533",
          title: "Hauwa Garba",
        },
        kind: "bot",
      },
      { kind: "me", text: "Record ₦25,000 for UNI-0533, November" },
      {
        card: {
          confirm: {
            cancelLabel: "Cancel",
            cancelledText: "Cancelled. Nothing was posted.",
            confirmLabel: "Post payment",
            doneText:
              "Posted once by Ali Danjuma on 18 Nov. Hauwa Garba’s statement shows it now.",
          },
          rows: [
            ["Member", "Hauwa Garba · UNI-0533"],
            ["Month", "November 2026"],
            ["Monthly savings", "₦25,000.00"],
          ],
          subtitle: "Review",
          title: "Payment to post",
        },
        kind: "bot",
      },
    ],
    who: "Ali Danjuma · treasurer · sample",
  },
}

export const setupSteps = {
  cooperative: [
    {
      body: "Enter your cooperative's name, member code letters and web address. We email you a secure link.",
      title: "Sign up and verify your email",
    },
    {
      body: "Add your office location, start date and password. You're signed in straight away.",
      title: "Add your cooperative's details",
    },
    {
      body: "Choose where your records start, then add your services, shares, charges and profit sharing.",
      title: "Set up how you run",
    },
    {
      body: "Add each member's balances or history, then go live. Members sign in on the web.",
      title: "Bring your members across",
    },
  ],
  member: [
    {
      body: "Your admin adds you with your balances and gives you your member code.",
      title: "Your cooperative adds you",
    },
    {
      body: "Use your member code to sign in to your cooperative's workspace.",
      title: "Sign in on the web",
    },
    {
      body: "See savings, financing and charges on separate lines, each with the batch or approval behind it.",
      title: "Check your statement",
    },
    {
      body: `Request mobile access from your cooperative. It approves the request and shares the ${mobileAccessLabel} charge first.`,
      title: "Add the app if you want it",
    },
  ],
} as const

export const trustControls = [
  {
    body: "Financing, guarantor answers and other sensitive actions wait for the roles your cooperative sets.",
    title: "Approvals by the right people",
  },
  {
    body: "See who acted, who authorised it, when it happened and what changed.",
    title: "A full activity report",
  },
  {
    body: "A reversal posts with a note, and the original entry stays on the record.",
    title: "Corrections keep the original",
  },
  {
    body: "No interest is calculated. Cooperative charges are set as their own rules and shown on separate lines.",
    title: "Interest-free financing",
  },
  {
    body: "Halaalvest takes no percentage of savings, financing, repayments, dividends or profits.",
    title: "No share of member funds",
  },
  {
    body: "Each cooperative's members, records and reports stay inside its own workspace.",
    title: "A private workspace",
  },
] as const

export const homepageFaqs: readonly { answer: readonly string[]; open?: boolean; question: string }[] = [
  {
    answer: [
      publicPricingSummary.replace("website assistant", "website AI assistant"),
      "Halaalvest sends your cooperative one bill a month, and your cooperative chooses whether it pays the seat fee or charges members. Provider costs such as SMS, KYC and payment gateways are passed through. Setup and migration help are quoted separately.",
    ],
    open: true,
    question: "What does Halaalvest cost?",
  },
  {
    answer: [
      "Members can ask about their savings, financing and receipts, and turn “I paid ₦25,000” into a receipt draft. Staff can look up a member, see which receipts are waiting, and prepare a payment for a member and month.",
      "Anything that changes a record waits for a person to confirm it, and permissions are checked on every answer.",
    ],
    question: "What can the AI assistant do?",
  },
  {
    answer: [
      "No. Halaalvest is operating software. It is not a lender, bank or custodian. Your cooperative keeps its own accounts and approves its own financing, and Halaalvest records what your officers do.",
    ],
    question: "Does Halaalvest hold our cooperative's money?",
  },
  {
    answer: [
      "Halaalvest does not calculate interest on financing. Any cooperative charge is set up as its own rule and shown on a separate line, and members see the total payable before they accept.",
    ],
    question: "How is financing kept interest-free?",
  },
  {
    answer: [
      "Yes. Add each member's balances or full history. Where full history is hard to rebuild, you can use reviewed opening balances with their source documents.",
    ],
    question: "Can we bring our existing records?",
  },
  {
    answer: [
      "Members request access from their cooperative. The cooperative reviews each request and shares the charge first. Halaalvest bills the cooperative directly.",
    ],
    question: "How do members get the mobile app?",
  },
]

export const homepageFooterColumns: readonly {
  links: readonly HomepageNavLink[]
  title: string
}[] = [
  {
    links: [
      ["#officers", "For officers"],
      ["#members", "For members"],
      ["/pricing", "Pricing"],
      ["/login", "Sign in"],
    ],
    title: "Product",
  },
  {
    links: [
      ["/support", "Help centre"],
      ["/contact", "Contact support"],
      ["/delete-account", "Close my account"],
    ],
    title: "Support",
  },
  {
    links: [
      ["/terms", "Terms"],
      ["/privacy", "Privacy"],
      ["/billing-policy", "Billing policy"],
      ["/cooperative-disclosures", "Cooperative disclosures"],
    ],
    title: "Legal",
  },
]

/** The sample monthly bill, priced by the same rules the dashboard bills with. */
export function sampleMonthlyBill(input: {
  assistantMessagesUsed: number
  mobileApprovals: number
  seats: number
}) {
  const whole = (value: number) =>
    Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
  const seats = whole(input.seats)
  const used = whole(input.assistantMessagesUsed)
  const approvals = whole(input.mobileApprovals)
  const extraMessages = Math.max(0, used - platformBillingPrices.assistantFreeMessages)
  const estimate = estimatePlatformBill({
    assistantBillableMessages: extraMessages,
    mobileTerms: Array.from({ length: approvals }, () => ({
      amount: cooperativeMobileAccessTerms.amount,
    })),
    seats,
  })
  const amountFor = (kind: string) =>
    estimate.lines.find((line) => line.kind === kind)?.amount ?? 0
  return {
    approvals,
    assistantAmount: amountFor("ai_overage"),
    extraMessages,
    mobileAmount: amountFor("mobile_access"),
    seatAmount: amountFor("seat_fee"),
    seats,
    total: estimate.total,
    used,
  }
}
