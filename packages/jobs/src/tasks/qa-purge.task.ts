import type { BackgroundTask } from "../trigger"
import { logger, task } from "@trigger.dev/sdk/v3"
import { qaPurgeHandler, type QaPurgePayload } from "../handlers/qa-purge"

export const qaPurgeTask: BackgroundTask<QaPurgePayload> = {
  id: "platform.qa.purge",
  run: qaPurgeHandler,
}

export const qaPurgeTriggerTask = task({
  id: qaPurgeTask.id,
  maxDuration: 1_800,
  queue: {
    concurrencyLimit: 1,
  },
  run: async (payload: QaPurgePayload) => {
    const result = await qaPurgeHandler(payload)

    logger.info("Finished QA data purge", {
      deletedCounts: result.deletedCounts,
      errorCount: result.errors.length,
      runId: payload.runId,
    })

    return result
  },
})
