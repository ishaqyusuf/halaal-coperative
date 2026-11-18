import { oversightBusinesses } from "@halaalvest/db/oversight"
import type { NextRequest } from "next/server"
import { handleOversightRead, listInput } from "@/lib/oversight-api"

export const dynamic = "force-dynamic"

export function GET(request: NextRequest) {
  return handleOversightRead(request, (db, params) => {
    const { search, cursor } = listInput(params)
    return oversightBusinesses(db, search, cursor)
  })
}
