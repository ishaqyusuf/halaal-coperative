import {
  createProductionQaHarnessCleanupPreviewReport,
  createProductionQaHarnessCleanupRehearsalReport,
  createProductionQaHarnessCleanupReport,
  createProductionQaHarnessPlan,
} from "@halaalvest/domain"
import {
  previewProductionQaHarnessCleanup,
  purgeProductionQaHarness,
  rehearseProductionQaHarnessCleanup,
} from "@halaalvest/db"

const plan = createProductionQaHarnessPlan({
  environment: process.env.HALAALVEST_ENV ?? "local",
  qaDomain: process.env.PRODUCTION_QA_DOMAIN ?? "ishaq.qa.test",
  runId: process.env.PRODUCTION_QA_RUN_ID ?? "ticket-30",
})
const preview = await previewProductionQaHarnessCleanup(plan)

if (process.env.PRODUCTION_QA_CLEANUP_REHEARSE === "1") {
  const expectedFingerprint =
    process.env.PRODUCTION_QA_CLEANUP_FINGERPRINT?.trim() ?? ""
  const confirmation =
    process.env.PRODUCTION_QA_CLEANUP_CONFIRMATION?.trim() ?? ""
  const receipt = await rehearseProductionQaHarnessCleanup({
    confirmation,
    expectedFingerprint,
    plan,
  })

  console.log(
    JSON.stringify(
      {
        receipt,
        report: createProductionQaHarnessCleanupRehearsalReport(receipt),
      },
      null,
      2
    )
  )
} else if (process.env.PRODUCTION_QA_CLEANUP_EXECUTE !== "1") {
  console.log(
    JSON.stringify(
      {
        preview,
        report: createProductionQaHarnessCleanupPreviewReport(preview),
      },
      null,
      2
    )
  )
} else {
  const expectedFingerprint =
    process.env.PRODUCTION_QA_CLEANUP_FINGERPRINT?.trim() ?? ""
  const confirmation =
    process.env.PRODUCTION_QA_CLEANUP_CONFIRMATION?.trim() ?? ""
  const receipt = await purgeProductionQaHarness({
    confirmation,
    expectedFingerprint,
    plan,
  })

  console.log(
    JSON.stringify(
      {
        receipt,
        report: createProductionQaHarnessCleanupReport(receipt),
      },
      null,
      2
    )
  )
}
