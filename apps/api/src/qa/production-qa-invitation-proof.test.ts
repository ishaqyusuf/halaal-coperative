import { describe, expect, test } from "bun:test"
import { runProductionQaInvitationProof } from "./production-qa-invitation-proof"

describe("production QA invitation proof runner safety", () => {
  test("requires explicit side-effect confirmation before database access", async () => {
    await expect(
      runProductionQaInvitationProof({
        confirmed: false,
        environment: "local",
        qaDomain: "ishaq.qa.test",
        runId: "invitation-proof",
      })
    ).rejects.toThrow("explicit confirmation")
  })

  test("fails closed in production before database access", async () => {
    await expect(
      runProductionQaInvitationProof({
        confirmed: true,
        environment: "production",
        qaDomain: "ishaq.qa.test",
        runId: "invitation-proof",
      })
    ).rejects.toThrow("available only")
  })
})
