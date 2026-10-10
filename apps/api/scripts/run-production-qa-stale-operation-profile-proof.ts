import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { runProductionQaStaleOperationProfileProof } from "../src/qa/production-qa-stale-operation-profile-proof"

const evidenceDirectory = process.env.PRODUCTION_QA_EVIDENCE_DIRECTORY?.trim()
const runId = process.env.PRODUCTION_QA_RUN_ID?.trim()
if (!evidenceDirectory || !runId) throw new Error("An explicit evidence directory and run ID are required.")
await mkdir(evidenceDirectory, { recursive: true })
const result = await runProductionQaStaleOperationProfileProof({
  environment: process.env.HALAALVEST_ENV ?? "local",
  qaDomain: process.env.PRODUCTION_QA_DOMAIN ?? "ishaq.qa.test", runId,
})
await writeFile(path.join(evidenceDirectory, "receipt.json"), JSON.stringify(result, null, 2))
console.log(JSON.stringify(result, null, 2))
process.exitCode = result.complete ? 0 : 1
