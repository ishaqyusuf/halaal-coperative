import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { runProductionQaMemberRoleDenialProof } from "../src/qa/production-qa-member-role-denial-proof"

const directory = process.env.PRODUCTION_QA_EVIDENCE_DIRECTORY?.trim()
const runId = process.env.PRODUCTION_QA_RUN_ID?.trim()
if (!directory || !runId) throw new Error("An explicit evidence directory and run ID are required.")
await mkdir(directory, { recursive: true })
const result = await runProductionQaMemberRoleDenialProof({
  environment: process.env.HALAALVEST_ENV ?? "local",
  qaDomain: process.env.PRODUCTION_QA_DOMAIN ?? "ishaq.qa.test",
  runId,
})
await writeFile(path.join(directory, "receipt.json"), JSON.stringify(result, null, 2))
console.log(JSON.stringify(result, null, 2))
// This API-only command intentionally cannot complete the Android checkpoint.
process.exitCode = result.complete ? 0 : 1
