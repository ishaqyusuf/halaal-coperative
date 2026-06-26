import type { BackgroundTask } from "../trigger"
import { logger, task } from "@trigger.dev/sdk/v3"
import {
  backfillInitializeHandler,
  type BackfillInitializePayload,
} from "../handlers/backfill-initialize"

export const backfillInitializeTask: BackgroundTask<BackfillInitializePayload> = {
  id: "member.backfill.initialize",
  run: async (payload) => {
    return backfillInitializeHandler(payload)
  },
}

export const backfillInitializeTriggerTask = task({
  id: backfillInitializeTask.id,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 2,
  },
  run: async (payload: BackfillInitializePayload) => {
    const result = await backfillInitializeHandler(payload)

    logger.info("Initialized member backfill draft", {
      memberId: payload.memberId,
      tenantId: payload.tenantId,
    })

    return result
  },
})
