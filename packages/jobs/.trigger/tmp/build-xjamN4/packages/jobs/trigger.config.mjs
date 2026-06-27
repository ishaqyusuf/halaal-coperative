import {
  defineConfig
} from "../../chunk-XBUIJJIU.mjs";
import "../../chunk-IQYMHLKB.mjs";
import "../../chunk-KIT4ZZ2O.mjs";
import "../../chunk-PQXCTT34.mjs";
import "../../chunk-EUQU77DM.mjs";
import "../../chunk-TGD5O53U.mjs";
import {
  __name,
  init_esm
} from "../../chunk-43KALBCX.mjs";

// trigger.config.ts
init_esm();
function getTriggerProjectId() {
  return process.env.TRIGGER_PROJECT_ID?.trim() || "halaalvest-jobs";
}
__name(getTriggerProjectId, "getTriggerProjectId");
var trigger_config_default = defineConfig({
  project: getTriggerProjectId(),
  runtime: "node-22",
  logLevel: "log",
  maxDuration: 120,
  retries: {
    enabledInDev: false,
    default: {
      factor: 2,
      maxAttempts: 3,
      maxTimeoutInMs: 1e4,
      minTimeoutInMs: 1e3,
      randomize: true
    }
  },
  build: {},
  dirs: ["./src/tasks"]
});
var resolveEnvVars = void 0;
export {
  trigger_config_default as default,
  resolveEnvVars
};
//# sourceMappingURL=trigger.config.mjs.map
