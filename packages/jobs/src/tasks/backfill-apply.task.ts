import type { BackgroundTask } from "../trigger"
import {
  backfillApplyHandler,
  type BackfillApplyPayload,
} from "../handlers/backfill-apply"

export const backfillApplyTask: BackgroundTask<BackfillApplyPayload> = {
  id: "member.backfill.apply",
  run: async (payload) => {
    await backfillApplyHandler(payload)
  },
}
