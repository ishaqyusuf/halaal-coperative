import {
  oversightPeriods,
  oversightSummary,
  type OversightPeriod,
} from "@halaalvest/db/oversight"
import type { NextRequest } from "next/server"
import {
  handleOversightRead,
  OversightInputError,
} from "@/lib/oversight-api"

export const dynamic = "force-dynamic"

export function GET(request: NextRequest) {
  return handleOversightRead(request, (db, params) => {
    const days = Number(params.get("days") ?? 30)
    if (!oversightPeriods.includes(days as OversightPeriod)) {
      throw new OversightInputError("Invalid period")
    }
    return oversightSummary(db, days as OversightPeriod)
  })
}
