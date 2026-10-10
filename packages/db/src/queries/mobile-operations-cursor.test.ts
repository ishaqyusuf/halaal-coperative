import { describe, expect, test } from "bun:test"
import { operationsCursorScope, readOperationsCursor, writeOperationsCursor } from "./mobile-operations-cursor"

const input = { tenantId: "tenant-a", lane: "review", search: "ABC" }
const id = "00000000-0000-4000-8000-000000000001"
const at = new Date("2026-09-07T08:00:00.000Z")

describe("mobile operations cursor", () => {
  test("round-trips the exact stable date and id position", () => {
    const scope = operationsCursorScope(input, "financing")
    expect(readOperationsCursor(writeOperationsCursor(scope, id, at), scope))
      .toEqual({ id, at })
    expect(readOperationsCursor(undefined, scope)).toBeNull()
  })

  test("rejects a cursor reused across tenant, lane, filter or resource", () => {
    const cursor = writeOperationsCursor(operationsCursorScope(input, "financing"), id, at)
    for (const scope of [
      operationsCursorScope({ ...input, tenantId: "tenant-b" }, "financing"),
      operationsCursorScope({ ...input, lane: "activity" }, "financing"),
      operationsCursorScope({ ...input, search: "XYZ" }, "financing"),
      operationsCursorScope({ ...input, entityId: id }, "financing"),
      operationsCursorScope(input, "repayments"),
    ]) expect(() => readOperationsCursor(cursor, scope)).toThrow("Refresh the list")
  })

  test("rejects malformed, oversized and invalid-position cursors", () => {
    const scope = operationsCursorScope(input, "financing")
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url")
    for (const cursor of [
      "not-json", "x".repeat(1025),
      encode({ version: 1, scope, id, at: "not-a-date" }),
      encode({ version: 1, scope, id: "unsafe-id", at: at.toISOString() }),
      encode({ version: 2, scope, id, at: at.toISOString() }),
    ]) expect(() => readOperationsCursor(cursor, scope)).toThrow("Refresh the list")
  })
})
