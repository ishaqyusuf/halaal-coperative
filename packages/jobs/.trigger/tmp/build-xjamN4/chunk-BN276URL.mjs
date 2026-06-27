import {
  applyBackfillBatch,
  buildBackfillDraft,
  buildBackfillDraftInputForMember,
  saveBackfillDraft
} from "./chunk-FZ27VSIX.mjs";
import {
  task
} from "./chunk-XBUIJJIU.mjs";
import {
  logger
} from "./chunk-PQXCTT34.mjs";
import {
  __name,
  init_esm
} from "./chunk-43KALBCX.mjs";

// src/tasks/backfill-apply.task.ts
init_esm();

// src/handlers/backfill-apply.ts
init_esm();
async function backfillApplyHandler(payload) {
  if (!payload.batchId) {
    const draftInput = await buildBackfillDraftInputForMember({
      tenantId: payload.tenantId,
      memberId: payload.memberId,
      startMonth: payload.startMonth ? /* @__PURE__ */ new Date(`${payload.startMonth}-01T00:00:00.000Z`) : void 0,
      endMonth: payload.endMonth ? /* @__PURE__ */ new Date(`${payload.endMonth}-01T00:00:00.000Z`) : void 0
    });
    const draft = buildBackfillDraft(draftInput);
    const saved = await saveBackfillDraft({
      tenantId: payload.tenantId,
      memberId: payload.memberId,
      actorUserId: payload.actorUserId,
      draftInput,
      draft
    });
    return applyBackfillBatch({
      tenantId: payload.tenantId,
      batchId: saved.id,
      memberId: payload.memberId,
      actorUserId: payload.actorUserId
    });
  }
  return applyBackfillBatch({
    tenantId: payload.tenantId,
    batchId: payload.batchId,
    memberId: payload.memberId,
    actorUserId: payload.actorUserId
  });
}
__name(backfillApplyHandler, "backfillApplyHandler");

// src/tasks/backfill-apply.task.ts
var backfillApplyTask = {
  id: "member.backfill.apply",
  run: /* @__PURE__ */ __name(async (payload) => {
    return backfillApplyHandler(payload);
  }, "run")
};
var backfillApplyTriggerTask = task({
  id: backfillApplyTask.id,
  maxDuration: 300,
  queue: {
    concurrencyLimit: 1
  },
  run: /* @__PURE__ */ __name(async (payload) => {
    const result = await backfillApplyHandler(payload);
    logger.info("Applied member backfill", {
      batchId: payload.batchId ?? null,
      memberId: payload.memberId,
      tenantId: payload.tenantId
    });
    return result;
  }, "run")
});

export {
  backfillApplyTask,
  backfillApplyTriggerTask
};
//# sourceMappingURL=chunk-BN276URL.mjs.map
