/**
 * Payment order (T30 screen 5, 22 Nov 2026): how a member's payment is
 * applied when they don't pick what it pays for. Keys mirror the server's
 * `PaymentAllocationOrderKey` in `packages/db/src/queries/member-payables.ts`.
 */

export type PaymentOrderKey =
  | "overdue"
  | "procurement"
  | "food_purchase"
  | "loan"
  | "shares"
  | "commitment"

export type PaymentOrderMode = "automatic" | "member_choice"

export type PaymentOrderLeftover = "special_savings"

export type PaymentOrderSettings = {
  leftoverDestination: PaymentOrderLeftover
  mode: PaymentOrderMode
  order: PaymentOrderKey[]
}

export const DEFAULT_PAYMENT_ORDER: PaymentOrderKey[] = [
  "overdue",
  "procurement",
  "food_purchase",
  "loan",
  "shares",
  "commitment",
]

export const DEFAULT_PAYMENT_ORDER_SETTINGS: PaymentOrderSettings = {
  leftoverDestination: "special_savings",
  mode: "automatic",
  order: DEFAULT_PAYMENT_ORDER,
}

export const paymentOrderItems = {
  overdue: {
    description: "Anything past its due date, oldest first",
    icon: "TriangleAlert",
    label: "Overdue first",
    tint: ["bg-tint-danger", "text-tint-danger-foreground"],
  },
  procurement: {
    description: "Instalments",
    icon: "Package",
    label: "Procurement",
    tint: ["bg-tint-lilac", "text-tint-lilac-foreground"],
  },
  food_purchase: {
    description: "Approved baskets",
    icon: "ShoppingBasket",
    label: "Foodstuff",
    tint: ["bg-tint-vivid", "text-tint-vivid-foreground"],
  },
  loan: {
    description: "Monthly repayments",
    icon: "HandCoins",
    label: "Loans",
    tint: ["bg-tint-sky", "text-tint-sky-foreground"],
  },
  shares: {
    description: "Approved share purchases",
    icon: "PieChart",
    label: "Shares",
    tint: ["bg-tint-warm", "text-tint-warm-foreground"],
  },
  commitment: {
    description: "This month’s commitment",
    icon: "BadgeCheck",
    label: "Commitment",
    tint: ["bg-accent", "text-accent-foreground"],
  },
} as const satisfies Record<
  PaymentOrderKey,
  { description: string; icon: string; label: string; tint: [string, string] }
>

export const paymentOrderModes = [
  {
    description:
      "Members enter the amount; we pay what they owe in your order below.",
    label: "Apply automatically",
    value: "automatic",
  },
  {
    description:
      "Members tap what they’re paying for. Anything extra still follows your order.",
    label: "Members choose",
    value: "member_choice",
  },
] as const satisfies readonly {
  description: string
  label: string
  value: PaymentOrderMode
}[]

export const paymentOrderLeftovers = {
  special_savings: {
    description: "Member can withdraw on request",
    label: "Special savings",
  },
} as const satisfies Record<
  PaymentOrderLeftover,
  { description: string; label: string }
>

const orderKeys = new Set<string>(DEFAULT_PAYMENT_ORDER)

/** Same rule as the server: known keys once each, missing keys appended in default order. */
export function normalizePaymentOrder(
  order: readonly string[] | null | undefined
): PaymentOrderKey[] {
  const picked: PaymentOrderKey[] = []
  for (const key of order ?? []) {
    if (orderKeys.has(key) && !picked.includes(key as PaymentOrderKey))
      picked.push(key as PaymentOrderKey)
  }
  for (const key of DEFAULT_PAYMENT_ORDER)
    if (!picked.includes(key)) picked.push(key)
  return picked
}

export function normalizePaymentOrderSettings(
  settings: Partial<{
    leftoverDestination: string | null
    mode: string | null
    order: readonly string[] | null
  }> | null | undefined
): PaymentOrderSettings {
  return {
    leftoverDestination: "special_savings",
    mode: settings?.mode === "member_choice" ? "member_choice" : "automatic",
    order: normalizePaymentOrder(settings?.order),
  }
}

/** Moves `from` to `to`, clamped to the list; returns the same array when nothing moves. */
export function movePaymentOrderItem<T>(list: readonly T[], from: number, to: number) {
  const target = Math.max(0, Math.min(list.length - 1, to))
  if (from === target || from < 0 || from >= list.length) return list as T[]
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(target, 0, item as T)
  return next
}

export function isSamePaymentOrderSettings(
  a: PaymentOrderSettings,
  b: PaymentOrderSettings
) {
  return (
    a.mode === b.mode &&
    a.leftoverDestination === b.leftoverDestination &&
    a.order.length === b.order.length &&
    a.order.every((key, index) => b.order[index] === key)
  )
}
