import { describe, expect, test } from "bun:test"
import {
  createProductionQaHarnessCleanupPreviewReport,
  createProductionQaHarnessCleanupRehearsalReport,
  createProductionQaHarnessCleanupReport,
  PRODUCTION_QA_HARNESS_CLEANUP_CONTRACT_VERSION,
  type ProductionQaHarnessCleanupPreview,
  type ProductionQaHarnessCleanupReceipt,
  type ProductionQaHarnessCleanupRehearsalReceipt,
} from "./production-qa-harness-cleanup"

const counts = {
  auditLogs: 12,
  ledgerTransactions: 3,
  memberDocuments: 0,
  members: 10,
  users: 36,
  workspaces: 9,
}

describe("production-contract QA harness cleanup reports", () => {
  test("renders a bounded preview without fingerprint or private identities", () => {
    const preview: ProductionQaHarnessCleanupPreview = {
      blockers: [],
      canPurge: true,
      contractVersion: PRODUCTION_QA_HARNESS_CLEANUP_CONTRACT_VERSION,
      counts,
      environment: "preview",
      fingerprint: "private-fingerprint",
      presentScenarioKeys: ["starter-healthy"],
      runId: "cleanup-42",
    }
    const report = createProductionQaHarnessCleanupPreviewReport(preview)

    expect(report).toContain("Safe to purge: yes")
    expect(report).toContain("Workspaces: 9")
    expect(report).not.toContain("private-fingerprint")
    expect(report).not.toContain("@ishaq.qa.test")
    expect(report).not.toContain("QSH-")
  })

  test("renders aggregate deletion and remaining counts", () => {
    const receipt: ProductionQaHarnessCleanupReceipt = {
      after: {
        ...counts,
        auditLogs: 0,
        ledgerTransactions: 0,
        members: 0,
        users: 0,
        workspaces: 0,
      },
      before: counts,
      completedAt: "2026-09-04T20:01:00.000Z",
      complete: true,
      contractVersion: PRODUCTION_QA_HARNESS_CLEANUP_CONTRACT_VERSION,
      deleted: counts,
      deletedScenarioKeys: ["starter-healthy"],
      environment: "preview",
      runId: "cleanup-42",
      startedAt: "2026-09-04T20:00:00.000Z",
    }
    const report = createProductionQaHarnessCleanupReport(receipt)

    expect(report).toContain("Complete: yes")
    expect(report).toContain("Deleted scenarios: 1")
    expect(report).toContain("Remaining target counts")
    expect(report).not.toMatch(/tenantId|password|sessionToken|documentUrl/)
  })

  test("renders rollback evidence without private target material", () => {
    const receipt: ProductionQaHarnessCleanupRehearsalReceipt = {
      afterRollback: counts,
      before: counts,
      completedAt: "2026-09-04T20:01:00.000Z",
      complete: true,
      contractVersion: PRODUCTION_QA_HARNESS_CLEANUP_CONTRACT_VERSION,
      environment: "local",
      rehearsalDeleted: counts,
      rehearsedScenarioKeys: ["starter-healthy"],
      rollbackVerified: true,
      runId: "cleanup-42",
      startedAt: "2026-09-04T20:00:00.000Z",
    }
    const report = createProductionQaHarnessCleanupRehearsalReport(receipt)

    expect(report).toContain("Rollback verified: yes")
    expect(report).toContain("The exact cleanup transaction was rolled back")
    expect(report).not.toContain("@ishaq.qa.test")
    expect(report).not.toContain("private-fingerprint")
  })
})
