import { expect, test } from "bun:test"
import { runProductionQaAndroidOperationProfileBaseline } from "./production-qa-android-operation-profile-baseline"

const input = {
  environment: "local",
  evidenceDirectory: "/tmp/halaalvest-operation-profile-guard-must-not-create",
  launchUrl: "exp+halaalvest://expo-development-client/",
  qaDomain: "ishaq.qa.test",
  runId: "operation-profile-matrix-guard",
  serial: "emulator-5554",
}

test("rejects matrix without draft auditing before database/session work", async () => {
  await expect(runProductionQaAndroidOperationProfileBaseline({
    ...input, accessibilityMatrix: true,
  })).rejects.toThrow("requires the draft-interaction audit")
})

test("rejects matrix changes on physical devices before database/session work", async () => {
  await expect(runProductionQaAndroidOperationProfileBaseline({
    ...input, accessibilityMatrix: true, exerciseDraft: true, serial: "physical-device",
  })).rejects.toThrow("restricted to Android emulators")
})
