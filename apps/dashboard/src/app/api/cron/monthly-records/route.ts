import { NextResponse, type NextRequest } from "next/server"
import {
  monthlyRecordGenerateHandler,
  monthlyRecordGenerateTask,
  triggerJob,
} from "@halaalvest/jobs"

function isAuthorized(request: NextRequest) {
  const secret = process.env.MONTHLY_RECORD_CRON_SECRET?.trim()
  if (!secret) {
    return false
  }

  const authorization = request.headers.get("authorization")
  const headerSecret = request.headers.get("x-cron-secret")

  return authorization === `Bearer ${secret}` || headerSecret === secret
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const actorUserId = process.env.MONTHLY_RECORD_CRON_ACTOR_USER_ID?.trim()
  if (!actorUserId) {
    return NextResponse.json(
      { error: "MONTHLY_RECORD_CRON_ACTOR_USER_ID is not configured" },
      { status: 503 }
    )
  }

  await triggerJob(
    monthlyRecordGenerateTask,
    async (payload) => monthlyRecordGenerateHandler(payload),
    {
      actorUserId,
      now: new Date().toISOString(),
    },
    { baseDelayMs: 1000, maxAttempts: 3 }
  )

  return NextResponse.json({ ok: true })
}
