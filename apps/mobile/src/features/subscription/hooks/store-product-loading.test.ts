import { describe, expect, it } from "bun:test"
import { loadStoreProducts } from "./store-product-loading"

describe("store product lookup during purchase recovery", () => {
  it("keeps recovery available when no new offers are configured", async () => {
    let lookupCalled = false
    const result = await loadStoreProducts([], async () => {
      lookupCalled = true
      return ["unexpected"]
    })
    expect(result).toEqual({ products: [], lookupFailed: false })
    expect(lookupCalled).toBe(false)
  })

  it("keeps recovery available when offer lookup fails after connection", async () => {
    const result = await loadStoreProducts(["starter"], async () => {
      throw new Error("Store catalog unavailable")
    })
    expect(result).toEqual({ products: [], lookupFailed: true })
  })

  it("treats a null store response as an unavailable lookup, not an empty configured catalog", async () => {
    expect(await loadStoreProducts(["starter"], async () => null)).toEqual({
      products: [],
      lookupFailed: true,
    })
    expect(await loadStoreProducts(["starter"], async () => [])).toEqual({
      products: [],
      lookupFailed: false,
    })
  })
})
