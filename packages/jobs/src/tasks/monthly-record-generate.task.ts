import type { BackgroundTask } from "../trigger"
import { monthlyRecordGenerateHandler } from "../handlers/monthly-record-generate"

export type MonthlyRecordGeneratePayload = {
  actorUserId: string
  now?: string
  tenantId?: string
}

export const monthlyRecordGenerateTask: BackgroundTask<MonthlyRecordGeneratePayload> = {
  id: "monthly-record-generate",
  run: monthlyRecordGenerateHandler,
}
