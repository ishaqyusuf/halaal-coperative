import {
  generateDueMonthlyRecords
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

// src/tasks/monthly-record-generate.task.ts
init_esm();

// src/handlers/monthly-record-generate.ts
init_esm();
async function monthlyRecordGenerateHandler(payload) {
  await generateDueMonthlyRecords({
    actorUserId: payload.actorUserId,
    now: payload.now ? new Date(payload.now) : void 0,
    tenantId: payload.tenantId
  });
}
__name(monthlyRecordGenerateHandler, "monthlyRecordGenerateHandler");

// src/tasks/monthly-record-generate.task.ts
var monthlyRecordGenerateTask = {
  id: "monthly-record-generate",
  run: monthlyRecordGenerateHandler
};
var monthlyRecordGenerateTriggerTask = task({
  id: monthlyRecordGenerateTask.id,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 1
  },
  run: /* @__PURE__ */ __name(async (payload) => {
    await monthlyRecordGenerateHandler(payload);
    logger.info("Generated due monthly records", {
      tenantId: payload.tenantId ?? null
    });
  }, "run")
});

export {
  monthlyRecordGenerateTask,
  monthlyRecordGenerateTriggerTask
};
//# sourceMappingURL=chunk-RW3OGF3E.mjs.map
