import { buildBackfillDraft } from "@halaalvest/backfill"
import {
  applyBackfillBatch,
  buildBackfillDraftInputForMember,
  saveBackfillDraft,
} from "@halaalvest/db"

export type BackfillApplyPayload = {
  actorUserId: string
  batchId?: string
  endMonth?: string
  memberId: string
  startMonth?: string
  tenantId: string
}

export async function backfillApplyHandler(payload: BackfillApplyPayload) {
  if (!payload.batchId) {
    const draftInput = await buildBackfillDraftInputForMember({
      tenantId: payload.tenantId,
      memberId: payload.memberId,
      startMonth: payload.startMonth
        ? new Date(`${payload.startMonth}-01T00:00:00.000Z`)
        : undefined,
      endMonth: payload.endMonth
        ? new Date(`${payload.endMonth}-01T00:00:00.000Z`)
        : undefined,
    })
    const draft = buildBackfillDraft(draftInput)
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
