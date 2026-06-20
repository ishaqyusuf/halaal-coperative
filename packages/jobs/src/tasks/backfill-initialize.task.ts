import type { BackgroundTask } from "../trigger"
import {
  backfillInitializeHandler,
  type BackfillInitializePayload,
} from "../handlers/backfill-initialize"

export const backfillInitializeTask: BackgroundTask<BackfillInitializePayload> = {
  id: "member.backfill.initialize",
  run: async (payload) => {
    await backfillInitializeHandler(payload)
  },
}
