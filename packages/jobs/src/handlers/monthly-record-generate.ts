import { generateDueMonthlyRecords } from "@halaalvest/db"
import type { MonthlyRecordGeneratePayload } from "../tasks/monthly-record-generate.task"

export async function monthlyRecordGenerateHandler(
  payload: MonthlyRecordGeneratePayload
) {
  await generateDueMonthlyRecords({
    actorUserId: payload.actorUserId,
    now: payload.now ? new Date(payload.now) : undefined,
    tenantId: payload.tenantId,
  })
}
