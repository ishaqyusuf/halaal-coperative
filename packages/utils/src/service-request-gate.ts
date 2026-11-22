/**
 * Member service request states (T30 procurement states, direction 01).
 *
 * Maps the server's access mode, open cycles and restriction reasons
 * (`deriveMobileProcurementAvailability` / `deriveMobileFoodPurchaseAvailability`
 * in `@halaalvest/db`) to one explained state. Platform-neutral: the mobile
 * app and the dashboard render the same states with their own components.
 * First written for mobile in `service-request-gate.ts` (commit 7e6feeb1).
 */

export type ServiceGateKind =
  | "procurement"
  | "food-purchase"
  | "project-financing"

/** Kinds Record payment accepts in its `payable` link (T30 kit contract). */
export type ServiceGatePayableKind = "procurement" | "food_purchase"
export type ServiceGatePayable = `${ServiceGatePayableKind}:${string}`

export type ServiceGateAccessMode =
  | "disabled"
  | "office_only"
  | "member_self_service"
  | "read_only"

export type ServiceGateState =
  | "disabled"
  | "office"
  | "paused"
  | "no-cycle"
  | "not-yet"
  | "error"

/** Lucide icon names; each app maps them to its own icon set. */
export type ServiceGateIcon =
  | "service"
  | "Landmark"
  | "CirclePause"
  | "CalendarDays"
  | "Sparkles"
  | "CircleAlert"

export type ServiceGateTint = "neutral" | "sky" | "warm" | "brand" | "danger"

export type ServiceGateStep = {
  key: string
  title: string
  detail: string
  done: boolean
  /** Inline Pay target for "settle your current item". */
  payable?: ServiceGatePayable
}

export type ServiceGate = {
  state: ServiceGateState
  icon: ServiceGateIcon
  tint: ServiceGateTint
  title: string
  description: string
  action: { kind: "support" | "retry"; label: string }
  steps?: ServiceGateStep[]
}

export type ServiceGateDesign = {
  /** "Procurement", "Foodstuff purchase". */
  title: string
  /** Singular request noun: "request", "application". */
  noun: string
}

export type ServiceGateInput = {
  kind: ServiceGateKind
  design: ServiceGateDesign
  accessMode: ServiceGateAccessMode
  canCreate: boolean
  /** The server's restriction reasons, verbatim. */
  reasons: readonly string[]
  /** Foodstuff: number of cycles the member can see; 0 means none open. */
  cycleCount?: number
  /** The member's current active item, for the "settle" step. */
  active?: {
    title: string
    outstanding: number | null
    payable: ServiceGatePayable | null
  } | null
  formatMoney: (amount: number) => string
}

const verificationReason = /verification/i
const obligationReason = /^settle an active/i
const financingReason = /active financing obligation/i
const cycleReason = /new foodstuff purchase cycle/i

export const memberVerificationReason =
  "Member verification is required before financial or operational actions can continue."

export function serviceLoadErrorGate(design: ServiceGateDesign): ServiceGate {
  return {
    action: { kind: "retry", label: "Try again" },
    description: "Check your connection and try again.",
    icon: "CircleAlert",
    state: "error",
    tint: "danger",
    title: `Couldn’t load ${design.title.toLowerCase()}`,
  }
}

/** Returns null when the member can start a request. */
export function serviceRequestGate(
  input: ServiceGateInput
): ServiceGate | null {
  const { design, kind } = input
  if (input.canCreate) return null
  const noun = `${design.noun}s`
  const ask = { kind: "support", label: "Ask the office" } as const
  switch (input.accessMode) {
    case "disabled":
      return {
        action: ask,
        description: `Your cooperative hasn’t turned on ${design.title.toLowerCase()} ${noun}. If you need something, tell the office and they’ll let you know.`,
        icon: "service",
        state: "disabled",
        tint: "neutral",
        title: `${design.title} isn’t offered yet`,
      }
    case "office_only":
      return {
        action: { kind: "support", label: "Contact the office" },
        description: `The office takes new ${noun} in person. Your ${noun} and payments still show here.`,
        icon: "Landmark",
        state: "office",
        tint: "sky",
        title: "Apply at the office",
      }
    case "read_only":
      return {
        action: ask,
        description: `The office has paused new ${noun}. Your current ${noun} and payments aren’t affected.`,
        icon: "CirclePause",
        state: "paused",
        tint: "warm",
        title: `New ${noun} are paused`,
      }
  }
  const reasons = input.reasons
  const noCycle =
    kind === "food-purchase" &&
    (input.cycleCount === 0 ||
      reasons.some((reason) => cycleReason.test(reason)))
  const others = reasons.filter((reason) => !cycleReason.test(reason))
  if (noCycle && !others.length) {
    return {
      action: { kind: "retry", label: "Check again" },
      description:
        "Applications open with each foodstuff cycle. You can apply as soon as the office opens the next one.",
      icon: "CalendarDays",
      state: "no-cycle",
      tint: "brand",
      title: "No cycle is open",
    }
  }

  const active = input.active ?? undefined
  const verified = !others.some((reason) => verificationReason.test(reason))
  const settled = !others.some((reason) => obligationReason.test(reason))
  const steps: ServiceGateStep[] = [
    {
      detail: verified
        ? "Your membership is verified"
        : "The office needs to verify your membership",
      done: verified,
      key: "verification",
      title: "Member verification",
    },
    {
      detail: settled
        ? `No unpaid ${design.noun}`
        : active?.outstanding
          ? `${input.formatMoney(active.outstanding)} left on ${active.title}`
          : `Pay off your current ${design.noun} first`,
      done: settled,
      key: "obligation",
      payable: settled ? undefined : (active?.payable ?? undefined),
      title: settled
        ? `Current ${design.noun} paid off`
        : "Settle your current item",
    },
  ]
  if (others.some((reason) => financingReason.test(reason))) {
    steps.push({
      detail: "Settle your active financing first",
      done: false,
      key: "financing",
      title: "Financing settled",
    })
  }
  others
    .filter(
      (reason) =>
        !verificationReason.test(reason) &&
        !obligationReason.test(reason) &&
        !financingReason.test(reason)
    )
    .forEach((reason, index) =>
      steps.push({
        detail: "Ask the office if you’re not sure what to do",
        done: false,
        key: `reason-${index}`,
        title: reason,
      })
    )
  if (noCycle) {
    steps.push({
      detail: "The office opens a cycle before taking applications",
      done: false,
      key: "cycle",
      title: "An open cycle",
    })
  }
  const left = steps.filter((step) => !step.done).length
  return {
    action: ask,
    description:
      left === 0
        ? `Ask the office what’s needed to start a new ${design.noun}.`
        : left === 1
          ? `One more thing and you can start a new ${design.noun}.`
          : `${left} more things and you can start a new ${design.noun}.`,
    icon: "Sparkles",
    state: "not-yet",
    steps,
    tint: "warm",
    title: "Not yet",
  }
}

/** The first schedule item that still has money due, in instalment order. */
export function nextUnpaidScheduleItem<
  T extends { amount: number; paidAmount: number; status: string },
>(items: readonly T[]): T | undefined {
  return items.find(
    (item) =>
      item.status !== "paid" &&
      item.status !== "cancelled" &&
      item.status !== "waived" &&
      item.amount > item.paidAmount
  )
}
