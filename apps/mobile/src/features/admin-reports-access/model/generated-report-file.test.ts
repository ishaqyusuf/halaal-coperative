import { describe, expect, test } from "bun:test"
import {
  cancelReportFile,
  completeReportFile,
  createPendingReportFile,
  expireGeneratedReportFile,
  failReportFile,
} from "./generated-report-file"

describe("generated report file lifecycle", () => {
  test("moves through pending, ready, and expired without retaining an expired URI", () => {
    const pending = createPendingReportFile({
      id: "report-1",
      reportKey: "members",
      reportTitle: "Member register",
    })
    const ready = completeReportFile(pending, {
      expiresAt: "2026-08-31T12:15:00.000Z",
      filename: "members.csv",
      generatedAt: "2026-08-31T12:00:00.000Z",
      mimeType: "text/csv",
      rowCount: 1,
      uri: "file:///private/members.csv",
    })

    expect(ready.status).toBe("ready")
    expect(
      expireGeneratedReportFile(
        ready,
        new Date("2026-08-31T12:16:00.000Z").getTime(),
      ),
    ).toMatchObject({ status: "expired", uri: null })
  })

  test("supports explicit cancellation and retryable failure state", () => {
    const pending = createPendingReportFile({
      id: "report-1",
      reportKey: "audit",
      reportTitle: "Audit activity",
    })
    expect(cancelReportFile(pending).status).toBe("cancelled")
    expect(failReportFile(pending, "Generation failed")).toMatchObject({
      error: "Generation failed",
      status: "failed",
    })
  })
})
