import {
  formatServiceMoney,
  type ServiceDesign,
  type ServiceKind,
  type ServiceRequest,
  type ServiceWorkspace,
} from "./service-request-model"

/** Kinds Record payment accepts in its `payable` link (T30 kit contract). */
export type PayableKind = "procurement" | "food_purchase"

export type PayLink = {
  pathname: "/(member)/receipts"
  params: { compose: "1"; payable: `${PayableKind}:${string}` }
}

export type RequestGateState =
  | "disabled"
  | "office"
  | "paused"
  | "no-cycle"
  | "not-yet"
  | "error"

export type RequestGateStep = {
  key: string
  title: string
  detail: string
  done: boolean
  pay?: PayLink
}

export type RequestGate = {
  state: RequestGateState
  icon: string
  tint: "neutral" | "sky" | "warm" | "brand" | "danger"
  title: string
  description: string
  action: { kind: "support" | "retry"; label: string }
  steps?: RequestGateStep[]
}

function nextUnpaid(row: ServiceRequest) {
  return row.payments?.find(
    (payment) =>
      payment.status !== "paid" &&
      payment.status !== "cancelled" &&
      payment.amount > payment.paid
  )
}

/**
 * Direction 02 Pay target for a request: the next unpaid procurement schedule
 * item, or the whole approved foodstuff application. Project financing has no
 * payable kind yet, so it never gets a Pay link.
 */
export function requestPayLink(
  kind: ServiceKind,
  row: ServiceRequest | null | undefined
): PayLink | null {
  if (!row || row.status !== "active") return null
  if (kind === "procurement") {
    const next = nextUnpaid(row)
    return next
      ? {
          pathname: "/(member)/receipts",
          params: { compose: "1", payable: `procurement:${next.id}` },
        }
      : null
  }
  if (kind === "food-purchase" && (row.outstanding ?? 0) > 0) {
    return {
      pathname: "/(member)/receipts",
      params: { compose: "1", payable: `food_purchase:${row.id}` },
    }
  }
  return null
}

export function requestLoadErrorGate(design: ServiceDesign): RequestGate {
  return {
    action: { kind: "retry", label: "Try again" },
    description: "Check your connection and try again.",
    icon: "CircleAlert",
    state: "error",
    tint: "danger",
    title: `Couldn’t load ${design.title.toLowerCase()}`,
  }
}

const verificationReason = /verification/i
const obligationReason = /^settle an active/i
const financingReason = /active financing obligation/i
const cycleReason = /new foodstuff purchase cycle/i

/**
 * Direction 01 procurement states. Maps the server's access mode, open cycles
 * and restriction reasons (`mobile-member-cooperative-services.ts`) to one
 * explained state. Returns null when the member can start a request.
 */
export function requestGate(
  kind: ServiceKind,
  design: ServiceDesign,
  workspace: ServiceWorkspace | undefined,
  currency: string
): RequestGate | null {
  if (!workspace || workspace.state !== "available" || workspace.canCreate)
    return null
  const noun = `${design.noun}s`
  const ask = { kind: "support", label: "Ask the office" } as const
  switch (workspace.accessMode) {
    case "disabled":
      return {
        action: ask,
        description: `Your cooperative hasn’t turned on ${design.title.toLowerCase()} ${noun}. If you need something, tell the office and they’ll let you know.`,
        icon: design.icon,
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
  const reasons = workspace.reasons
  const noCycle =
    kind === "food-purchase" &&
    (workspace.cycles?.length === 0 ||
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

  const active = workspace.activeRequest ?? undefined
  const verified = !others.some((reason) => verificationReason.test(reason))
  const settled = !others.some((reason) => obligationReason.test(reason))
  const steps: RequestGateStep[] = [
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
          ? `${formatServiceMoney(active.outstanding, currency)} left on ${active.title}`
          : `Pay off your current ${design.noun} first`,
      done: settled,
      key: "obligation",
      pay: settled ? undefined : (requestPayLink(kind, active) ?? undefined),
      title: `Current ${design.noun} paid off`,
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
    title: "Almost there",
  }
}
