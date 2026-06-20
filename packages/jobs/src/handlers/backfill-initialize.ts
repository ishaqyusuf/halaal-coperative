import { buildBackfillDraft, type BuildBackfillDraftInput } from "@halaalvest/backfill"
import { buildBackfillDraftInputForMember, saveBackfillDraft } from "@halaalvest/db"

export type BackfillInitializePayload = {
  actorUserId?: string
  draftInput?: BuildBackfillDraftInput
  endMonth?: string
  memberId: string
  startMonth?: string
  tenantId: string
}

export async function backfillInitializeHandler(payload: BackfillInitializePayload) {
  const draftInput =
    payload.draftInput ??
    (await buildBackfillDraftInputForMember({
      tenantId: payload.tenantId,
      memberId: payload.memberId,
      startMonth: payload.startMonth ? new Date(`${payload.startMonth}-01T00:00:00.000Z`) : undefined,
      endMonth: payload.endMonth ? new Date(`${payload.endMonth}-01T00:00:00.000Z`) : undefined,
    }))

  const draft = buildBackfillDraft(draftInput)

  return saveBackfillDraft({
    tenantId: payload.tenantId,
    memberId: payload.memberId,
    actorUserId: payload.actorUserId,
    draftInput,
    draft,
  })
}
