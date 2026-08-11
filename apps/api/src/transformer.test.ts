import { describe, expect, test } from "bun:test"
import { Decimal } from "@prisma/client-runtime-utils"
import { halaalvestDataTransformer } from "./transformer"

describe("Halaalvest data transformer", () => {
  test("serializes Prisma Decimal values into a plain hydration payload", () => {
    const serialized = halaalvestDataTransformer.serialize({
      repaymentScheduleItem: {
        amountPaid: new Decimal("250.00"),
        chargeDue: new Decimal("25.00"),
        principalDue: new Decimal("1000.00"),
        totalDue: new Decimal("1025.00"),
      },
    }) as {
      json: {
        repaymentScheduleItem: Record<string, unknown>
      }
    }

    expect(serialized.json.repaymentScheduleItem).toEqual({
      amountPaid: "250",
      chargeDue: "25",
      principalDue: "1000",
      totalDue: "1025",
    })
    expect(
      Object.values(serialized.json.repaymentScheduleItem).every(
        (value) => typeof value === "string"
      )
    ).toBe(true)
  })

  test("restores exact Decimal values after transport", () => {
    const value = new Decimal("9007199254740993.25")
    const restored = halaalvestDataTransformer.deserialize<{
      amount: Decimal
    }>(halaalvestDataTransformer.serialize({ amount: value })).amount

    expect(Decimal.isDecimal(restored)).toBe(true)
    expect(restored.toString()).toBe("9007199254740993.25")
  })
})
