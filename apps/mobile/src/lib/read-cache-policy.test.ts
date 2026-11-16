import { describe, expect, test } from "bun:test"
import {
  isLegacyUnpersistableReadKey,
  isPersistableReadInput,
} from "./read-cache-policy"

describe("read cache persistence policy", () => {
  test("keeps a screen's default first page", () => {
    expect(isPersistableReadInput(undefined)).toBe(true)
    expect(isPersistableReadInput({})).toBe(true)
    expect(isPersistableReadInput({ lane: "pending", search: "" })).toBe(true)
    expect(isPersistableReadInput({ search: "   " })).toBe(true)
    expect(isPersistableReadInput({ cursor: null, page: 1 })).toBe(true)
  })

  test("never persists typed search text", () => {
    expect(isPersistableReadInput({ search: "Aisha" })).toBe(false)
    expect(isPersistableReadInput({ query: "loan" })).toBe(false)
    expect(isPersistableReadInput({ q: "0803" })).toBe(false)
  })

  test("never persists pages after the first", () => {
    expect(isPersistableReadInput({ cursor: "abc" })).toBe(false)
    expect(isPersistableReadInput({ page: 2 })).toBe(false)
  })

  test("finds keys written before the policy", () => {
    expect(
      isLegacyUnpersistableReadKey(
        'halaalvest_mobile_read_cache:s:admin.charges.{"lane":"due","search":"Aisha"}'
      )
    ).toBe(true)
    expect(
      isLegacyUnpersistableReadKey(
        'halaalvest_mobile_read_cache:s:admin.member-directory.{"page":12}'
      )
    ).toBe(true)
    expect(
      isLegacyUnpersistableReadKey(
        'halaalvest_mobile_read_cache:s:admin.repayment-operations.{"cursor":"c1"}'
      )
    ).toBe(true)
    expect(
      isLegacyUnpersistableReadKey(
        'halaalvest_mobile_read_cache:s:admin.charges.{"lane":"due","search":""}'
      )
    ).toBe(false)
    expect(
      isLegacyUnpersistableReadKey(
        'halaalvest_mobile_read_cache:s:admin.member-directory.{"page":1}'
      )
    ).toBe(false)
    expect(
      isLegacyUnpersistableReadKey("halaalvest_mobile_read_cache:s:member.home")
    ).toBe(false)
  })
})
