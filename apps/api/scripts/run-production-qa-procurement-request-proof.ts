import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { runProductionQaProcurementRequestProof } from "../src/qa/production-qa-procurement-request-proof"

const evidenceDirectory = process.env.PRODUCTION_QA_ANDROID_EVIDENCE_DIRECTORY?.trim()
if (!evidenceDirectory) throw new Error("An explicit versioned evidence directory is required.")
const result = await runProductionQaProcurementRequestProof({
  environment: process.env.HALAALVEST_ENV ?? "local",
  qaDomain: process.env.PRODUCTION_QA_DOMAIN ?? "ishaq.qa.test",
  runId: process.env.PRODUCTION_QA_RUN_ID ?? "t30-procurement-api-v1",
})
await mkdir(evidenceDirectory, { recursive: true })
await writeFile(path.join(evidenceDirectory, "api-receipt.json"), JSON.stringify(result, null, 2))
console.log(JSON.stringify(result, null, 2))
// API-only execution intentionally leaves the required Android step blocked.
process.exitCode = result.complete ? 0 : 1
