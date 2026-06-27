import {
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

// src/tasks/backfill-initialize.task.ts
init_esm();

// src/handlers/backfill-initialize.ts
init_esm();
async function backfillInitializeHandler(payload) {
  const draftInput = await buildBackfillDraftInputForMember({
    tenantId: payload.tenantId,
    memberId: payload.memberId,
    startMonth: payload.startMonth ? /* @__PURE__ */ new Date(`${payload.startMonth}-01T00:00:00.000Z`) : void 0,
    endMonth: payload.endMonth ? /* @__PURE__ */ new Date(`${payload.endMonth}-01T00:00:00.000Z`) : void 0
  });
  const draft = buildBackfillDraft(draftInput);
  return saveBackfillDraft({
    tenantId: payload.tenantId,
    memberId: payload.memberId,
    actorUserId: payload.actorUserId,
    draftInput,
    draft
  });
}
__name(backfillInitializeHandler, "backfillInitializeHandler");

// src/tasks/backfill-initialize.task.ts
var backfillInitializeTask = {
  id: "member.backfill.initialize",
  run: /* @__PURE__ */ __name(async (payload) => {
    return backfillInitializeHandler(payload);
  }, "run")
};
var backfillInitializeTriggerTask = task({
  id: backfillInitializeTask.id,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 2
  },
  run: /* @__PURE__ */ __name(async (payload) => {
    const result = await backfillInitializeHandler(payload);
    logger.info("Initialized member backfill draft", {
      memberId: payload.memberId,
      tenantId: payload.tenantId
    });
    return result;
  }, "run")
});

export {
  backfillInitializeTask,
  backfillInitializeTriggerTask
};
//# sourceMappingURL=chunk-YBAE2MRJ.mjs.map
