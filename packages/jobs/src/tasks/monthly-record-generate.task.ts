import type { BackgroundTask } from "../trigger"
import { logger, task } from "@trigger.dev/sdk/v3"
import { monthlyRecordGenerateHandler } from "../handlers/monthly-record-generate"

export type MonthlyRecordGeneratePayload = {
  actorUserId: string
  now?: string
  tenantId?: string
}

export const monthlyRecordGenerateTask: BackgroundTask<MonthlyRecordGeneratePayload> =
  {
    id: "monthly-record-generate",
    run: monthlyRecordGenerateHandler,
  }

export const monthlyRecordGenerateTriggerTask = task({
  id: monthlyRecordGenerateTask.id,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 1,
  },
  run: async (payload: MonthlyRecordGeneratePayload) => {
    await monthlyRecordGenerateHandler(payload)

    logger.info("Generated due monthly records", {
      tenantId: payload.tenantId ?? null,
    })
  },
})
