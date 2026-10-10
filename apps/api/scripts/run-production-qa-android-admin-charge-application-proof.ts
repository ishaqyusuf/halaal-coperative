import { runProductionQaAndroidAdminChargeApplicationProof } from "../src/qa/production-qa-android-admin-charge-application-proof"

const evidenceDirectory =
  process.env.PRODUCTION_QA_ANDROID_EVIDENCE_DIRECTORY?.trim()
const runId = process.env.PRODUCTION_QA_RUN_ID?.trim()
if (!evidenceDirectory || !runId) {
  throw new Error("An explicit evidence directory and run ID are required.")
}

const result = await runProductionQaAndroidAdminChargeApplicationProof({
  environment: process.env.HALAALVEST_ENV ?? "local",
  evidenceDirectory,
  launchUrl:
    process.env.PRODUCTION_QA_ANDROID_LAUNCH_URL?.trim() ||
    "exp+halaalvest://expo-development-client/?url=http%3A%2F%2F10.0.2.2%3A1443",
  qaDomain: process.env.PRODUCTION_QA_DOMAIN ?? "ishaq.qa.test",
  runId,
  serial: process.env.PRODUCTION_QA_ANDROID_SERIAL?.trim() || "emulator-5554",
})

console.log(JSON.stringify(result, null, 2))
process.exitCode = result.complete ? 0 : 1
