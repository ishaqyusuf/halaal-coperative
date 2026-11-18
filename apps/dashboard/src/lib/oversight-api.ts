import { createHash, timingSafeEqual } from "node:crypto"
import { createPrismaClient } from "@halaalvest/db"
import { NextResponse, type NextRequest } from "next/server"

/**
 * Server-to-server reads for the Oversight portfolio desk (contract v1).
 * Oversight sends `Authorization: Bearer <OVERSIGHT_READ_KEY>`; without a
 * configured 32+ character key every request is refused.
 */
export function validOversightKey(
  received: string | undefined,
  expected: string | undefined
) {
  if (!received || !expected || expected.length < 32) return false
  return timingSafeEqual(
    createHash("sha256").update(received).digest(),
    createHash("sha256").update(expected).digest()
  )
}

const noStore = { "Cache-Control": "no-store" }

export function oversightJson(body: unknown, status = 200) {
  return NextResponse.json(body, { headers: noStore, status })
}

export async function handleOversightRead(
  request: NextRequest,
  read: (
    db: NonNullable<ReturnType<typeof createPrismaClient>>,
    params: URLSearchParams
  ) => Promise<unknown>
) {
  const key = request.headers.get("authorization")?.replace(/^Bearer /, "")
  if (!validOversightKey(key, process.env.OVERSIGHT_READ_KEY?.trim())) {
    return oversightJson({ error: "Unauthorized" }, 401)
  }
  const db = createPrismaClient()
  if (!db) return oversightJson({ error: "Project data is unavailable" }, 503)
  try {
    return oversightJson(await read(db, request.nextUrl.searchParams))
  } catch (error) {
    if (error instanceof OversightInputError) {
      return oversightJson({ error: error.message }, 400)
    }
    console.error("oversight read failed", error)
    return oversightJson({ error: "Project data is unavailable" }, 503)
  }
}

export class OversightInputError extends Error {}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function listInput(params: URLSearchParams) {
  const search = (params.get("search") ?? "").trim()
  const cursor = params.get("cursor") ?? undefined
  // Cursors are the last row's UUID from the previous page.
  if (search.length > 100 || (cursor && !uuid.test(cursor))) {
    throw new OversightInputError("Invalid filters")
  }
  return { search, cursor: cursor || undefined }
}
