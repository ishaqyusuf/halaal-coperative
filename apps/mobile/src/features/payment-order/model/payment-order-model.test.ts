import { describe, expect, test } from "bun:test"
import {
  DEFAULT_PAYMENT_ORDER,
  isSamePaymentOrderSettings,
  movePaymentOrderItem,
  normalizePaymentOrder,
  normalizePaymentOrderSettings,
} from "./payment-order-model"

describe("payment order model", () => {
  test("an empty saved order reads as the cooperative default", () => {
    expect(normalizePaymentOrder([])).toEqual(DEFAULT_PAYMENT_ORDER)
    expect(normalizePaymentOrder(null)).toEqual(DEFAULT_PAYMENT_ORDER)
  })

  test("unknown and repeated keys drop; missing keys append in default order", () => {
    expect(normalizePaymentOrder(["loan", "other", "loan", "shares"])).toEqual([
      "loan",
      "shares",
      "overdue",
      "procurement",
      "food_purchase",
      "commitment",
    ])
  })

  test("settings default to automatic with special savings", () => {
    expect(normalizePaymentOrderSettings(undefined)).toEqual({
      leftoverDestination: "special_savings",
      mode: "automatic",
      order: DEFAULT_PAYMENT_ORDER,
    })
    expect(normalizePaymentOrderSettings({ mode: "member_choice" }).mode).toBe(
      "member_choice"
    )
    expect(normalizePaymentOrderSettings({ mode: "nonsense" }).mode).toBe(
      "automatic"
    )
  })

  test("move clamps to the list and keeps every item", () => {
    const list = ["a", "b", "c", "d"]
    expect(movePaymentOrderItem(list, 0, 2)).toEqual(["b", "c", "a", "d"])
    expect(movePaymentOrderItem(list, 3, -4)).toEqual(["d", "a", "b", "c"])
    expect(movePaymentOrderItem(list, 1, 1)).toBe(list)
  })

  test("dirty check compares mode and order", () => {
    const base = normalizePaymentOrderSettings(undefined)
    expect(isSamePaymentOrderSettings(base, { ...base })).toBe(true)
    expect(
      isSamePaymentOrderSettings(base, {
        ...base,
        order: movePaymentOrderItem(base.order, 0, 5),
      })
    ).toBe(false)
    expect(
      isSamePaymentOrderSettings(base, { ...base, mode: "member_choice" })
    ).toBe(false)
  })
})
