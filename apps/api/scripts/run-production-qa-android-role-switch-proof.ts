import path from "node:path"
import { mkdir, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

import { runProductionQaAndroidRoleSwitchProof } from "../src/qa/production-qa-android-role-switch-proof"

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url))
const evidenceDirectory =
  process.env.PRODUCTION_QA_ANDROID_EVIDENCE_DIRECTORY?.trim() ||
  path.join(
    repositoryRoot,
    ".scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/workspace-role-switch"
  )

const result = await runProductionQaAndroidRoleSwitchProof({
  adbPath: process.env.ADB_PATH?.trim() || undefined,
  accessibilityMatrix:
    process.env.PRODUCTION_QA_ANDROID_ACCESSIBILITY_MATRIX === "1",
  environment: process.env.HALAALVEST_ENV ?? "local",
  evidenceDirectory,
  launchUrl:
    process.env.PRODUCTION_QA_ANDROID_LAUNCH_URL?.trim() ||
    "exp+halaalvest://expo-development-client/?url=http%3A%2F%2F10.0.2.2%3A1443",
  packageName:
    process.env.PRODUCTION_QA_ANDROID_PACKAGE?.trim() ||
    "com.halaalvest.mobile",
  qaDomain: process.env.PRODUCTION_QA_DOMAIN ?? "ishaq.qa.test",
  runId: process.env.PRODUCTION_QA_RUN_ID ?? "ticket-30-android-role-switch",
  serial: process.env.PRODUCTION_QA_ANDROID_SERIAL?.trim() || "emulator-5554",
})

const receipt = JSON.stringify(result, null, 2)
await mkdir(evidenceDirectory, { recursive: true })
await writeFile(path.join(evidenceDirectory, "receipt.json"), `${receipt}\n`)
console.log(JSON.stringify(result, null, 2))
process.exitCode = result.complete ? 0 : 1
