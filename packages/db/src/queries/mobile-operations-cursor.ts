import { createHash } from "node:crypto"
import { ExpectedQueryError } from "../query-error"

export function operationsCursorScope(input: {
  tenantId: string
  lane: string
  search?: string
  entityId?: string
}, resource: string) {
  return createHash("sha256")
    .update(JSON.stringify([resource, input.tenantId, input.lane, input.search ?? "", input.entityId ?? ""]))
    .digest("hex")
}

export function readOperationsCursor(value: string | null | undefined, scope: string) {
  if (!value) return null
  try {
    if (value.length > 1024 || !/^[A-Za-z0-9_-]+$/.test(value)) throw ExpectedQueryError.validation("This page has expired. Refresh the list.")
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"))
    if (
      parsed?.version !== 1 || parsed.scope !== scope ||
      typeof parsed.id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parsed.id) ||
      typeof parsed.at !== "string" ||
      !Number.isFinite(Date.parse(parsed.at)) ||
      new Date(parsed.at).toISOString() !== parsed.at
    ) throw ExpectedQueryError.validation("This page has expired. Refresh the list.")
    return { id: parsed.id as string, at: new Date(parsed.at) }
  } catch {
    throw ExpectedQueryError.validation("This page has expired. Refresh the list.")
  }
}

// A cursor is a position, never authorization. Every query must still filter by tenant.
export function writeOperationsCursor(scope: string, id: string, at: Date) {
  return Buffer.from(JSON.stringify({ version: 1, scope, id, at: at.toISOString() }))
    .toString("base64url")
}
