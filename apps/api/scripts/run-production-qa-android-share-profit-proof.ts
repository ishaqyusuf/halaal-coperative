import path from "node:path"
import { fileURLToPath } from "node:url"

import { runProductionQaAndroidShareProfitProof } from "../src/qa/production-qa-android-share-profit-proof"

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url))
const evidenceDirectory =
  process.env.PRODUCTION_QA_ANDROID_EVIDENCE_DIRECTORY?.trim() ||
  path.join(
    repositoryRoot,
    ".scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/share-profit-governance"
  )

const result = await runProductionQaAndroidShareProfitProof({
  adbPath: process.env.ADB_PATH?.trim() || undefined,
  environment: process.env.HALAALVEST_ENV ?? "local",
  evidenceDirectory,
  launchUrl:
    process.env.PRODUCTION_QA_ANDROID_LAUNCH_URL?.trim() ||
    "exp+halaalvest://expo-development-client/?url=http%3A%2F%2F10.0.2.2%3A1443",
  packageName:
    process.env.PRODUCTION_QA_ANDROID_PACKAGE?.trim() ||
    "com.halaalvest.mobile",
  qaDomain: process.env.PRODUCTION_QA_DOMAIN ?? "ishaq.qa.test",
  runId: process.env.PRODUCTION_QA_RUN_ID ?? "ticket-30-android-share-profit",
  serial: process.env.PRODUCTION_QA_ANDROID_SERIAL?.trim() || "emulator-5554",
})

console.log(JSON.stringify(result, null, 2))
process.exitCode = result.complete ? 0 : 1
