import { describe, expect, test } from "bun:test"
import { paymentOrderUpdateInput } from "./mobile-admin-payment-order.route"

const order = ["overdue", "procurement", "food_purchase", "loan", "shares", "commitment"]

describe("payment order update input", () => {
  test("accepts every key once in any order", () => {
    expect(
      paymentOrderUpdateInput.safeParse({
        leftoverDestination: "special_savings",
        mode: "member_choice",
        order: [...order].reverse(),
      }).success
    ).toBe(true)
  })

  test.each([
    ["a missing key", order.slice(1)],
    ["a repeated key", [...order.slice(0, 5), "overdue"]],
    ["an unknown key", [...order.slice(0, 5), "other"]],
  ])("rejects %s", (_, value) => {
    expect(
      paymentOrderUpdateInput.safeParse({
        leftoverDestination: "special_savings",
        mode: "automatic",
        order: value,
      }).success
    ).toBe(false)
  })

  test("rejects an unknown mode or leftover", () => {
    expect(
      paymentOrderUpdateInput.safeParse({ leftoverDestination: "special_savings", mode: "manual", order }).success
    ).toBe(false)
    expect(
      paymentOrderUpdateInput.safeParse({ leftoverDestination: "commitment", mode: "automatic", order }).success
    ).toBe(false)
  })
})
