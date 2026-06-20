import { buildBackfillDraft } from "@halaalvest/backfill"
import {
  applyBackfillBatch,
  buildBackfillDraftInputForMember,
  saveBackfillDraft,
} from "@halaalvest/db"
import type { BackfillDraft, BuildBackfillDraftInput } from "@halaalvest/backfill"

export type BackfillApplyPayload = {
  actorUserId: string
  batchId?: string
  draft?: BackfillDraft
  draftInput?: BuildBackfillDraftInput
  memberId: string
  tenantId: string
}

export async function backfillApplyHandler(payload: BackfillApplyPayload) {
  if (payload.draftInput || payload.draft) {
    const draftInput =
      payload.draftInput ??
      (await buildBackfillDraftInputForMember({
        tenantId: payload.tenantId,
        memberId: payload.memberId,
      }))

    const draft = payload.draft ?? buildBackfillDraft(draftInput)
    const saved = await saveBackfillDraft({
      tenantId: payload.tenantId,
      memberId: payload.memberId,
      actorUserId: payload.actorUserId,
      draftInput,
      draft,
    })

    return applyBackfillBatch({
      tenantId: payload.tenantId,
      batchId: saved.id,
      memberId: payload.memberId,
      actorUserId: payload.actorUserId,
    })
  }

  return applyBackfillBatch({
    tenantId: payload.tenantId,
    batchId: payload.batchId,
    memberId: payload.memberId,
    actorUserId: payload.actorUserId,
  })
}
