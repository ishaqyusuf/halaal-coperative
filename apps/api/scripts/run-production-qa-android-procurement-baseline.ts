import { runProductionQaAndroidProcurementBaseline } from "../src/qa/production-qa-android-procurement-proof"

const evidenceDirectory = process.env.PRODUCTION_QA_ANDROID_EVIDENCE_DIRECTORY?.trim()
if (!evidenceDirectory) throw new Error("An explicit versioned evidence directory is required.")
const result = await runProductionQaAndroidProcurementBaseline({
  environment: process.env.HALAALVEST_ENV ?? "local",
  evidenceDirectory,
  launchUrl: process.env.PRODUCTION_QA_ANDROID_LAUNCH_URL?.trim() || "exp+halaalvest://expo-development-client/?url=http%3A%2F%2F10.0.2.2%3A1443",
  qaDomain: process.env.PRODUCTION_QA_DOMAIN ?? "ishaq.qa.test",
  runId: process.env.PRODUCTION_QA_RUN_ID ?? "t30-procurement-baseline-v1",
  serial: process.env.PRODUCTION_QA_ANDROID_SERIAL?.trim() || "emulator-5554",
  presentationOnly: process.env.PRODUCTION_QA_ANDROID_PRESENTATION_ONLY === "1",
  exerciseInputs: process.env.PRODUCTION_QA_ANDROID_EXERCISE_INPUTS === "1",
  accessibilityMatrix: process.env.PRODUCTION_QA_ANDROID_ACCESSIBILITY_MATRIX === "1",
  inspectFooter: process.env.PRODUCTION_QA_ANDROID_INSPECT_FOOTER === "1",
})
console.log(JSON.stringify(result, null, 2))
process.exitCode = result.complete ? 0 : 1
