import { runProductionQaMemberCoreReadProof } from "../src/qa/production-qa-member-core-read-proof"

const result = await runProductionQaMemberCoreReadProof({
  environment: process.env.HALAALVEST_ENV ?? "local",
  qaDomain: process.env.PRODUCTION_QA_DOMAIN ?? "ishaq.qa.test",
  runId: process.env.PRODUCTION_QA_RUN_ID ?? "ticket-30-member-core",
})

console.log(JSON.stringify(result, null, 2))
