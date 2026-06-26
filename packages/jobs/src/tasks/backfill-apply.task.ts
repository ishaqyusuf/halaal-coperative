import type { BackgroundTask } from "../trigger"
import { logger, task } from "@trigger.dev/sdk/v3"
import {
  backfillApplyHandler,
  type BackfillApplyPayload,
} from "../handlers/backfill-apply"

export const backfillApplyTask: BackgroundTask<BackfillApplyPayload> = {
  id: "member.backfill.apply",
  run: async (payload) => {
    return backfillApplyHandler(payload)
  },
}

export const backfillApplyTriggerTask = task({
  id: backfillApplyTask.id,
  maxDuration: 300,
  queue: {
    concurrencyLimit: 1,
  },
  run: async (payload: BackfillApplyPayload) => {
    const result = await backfillApplyHandler(payload)

    logger.info("Applied member backfill", {
      batchId: payload.batchId ?? null,
      memberId: payload.memberId,
      tenantId: payload.tenantId,
    })

    return result
  },
})
