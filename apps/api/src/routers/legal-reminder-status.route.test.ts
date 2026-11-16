import { describe, expect, test } from "bun:test"
import { buildRequestContext } from "../context"
import { createCallerFactory } from "../lib.trpc"
import { legalRouter, resolveLegalReminderStatus } from "./legal.route"

const caller = createCallerFactory(legalRouter)
const terms = {
  contentHash: "a".repeat(64),
  documentType: "terms",
  documentVersion: "2026-11-01",
}
const privacy = {
  contentHash: "b".repeat(64),
  documentType: "privacy",
  documentVersion: "2026-11-01",
}

describe("legal.reminderStatus (mobile More reminder)", () => {
  test("a signed-out caller gets nothing", async () => {
    const anonymous = caller(
      await buildRequestContext(
        new Headers({ host: "api.halaalvest.localhost" })
      )
    )
    const result = await anonymous.reminderStatus().then(
      () => "ok",
      (error: { code?: string }) => error.code ?? "ERROR"
    )
    expect(result).toBe("UNAUTHORIZED")
  })

  test("no published bundle: no reminder and no records read", async () => {
    let reads = 0
    const status = await resolveLegalReminderStatus({
      bundle: { available: false, documents: [] },
      loadRecords: async () => {
        reads += 1
        return []
      },
    })
    expect(status).toEqual({ needsReview: false })
    expect(reads).toBe(0)
  })

  test("answers only a boolean, true until every current document is recorded", async () => {
    const bundle = { available: true, documents: [terms, privacy] }
    expect(
      await resolveLegalReminderStatus({
        bundle,
        loadRecords: async () => [terms],
      })
    ).toEqual({ needsReview: true })
    expect(
      await resolveLegalReminderStatus({
        bundle,
        loadRecords: async () => [privacy, terms],
      })
    ).toEqual({ needsReview: false })
    expect(
      await resolveLegalReminderStatus({
        bundle,
        loadRecords: async () => [
          { ...terms, contentHash: "c".repeat(64) },
          privacy,
        ],
      })
    ).toEqual({ needsReview: true })
  })
})
