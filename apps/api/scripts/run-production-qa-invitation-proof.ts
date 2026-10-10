import { runProductionQaInvitationProof } from "../src/qa/production-qa-invitation-proof"

const receipt = await runProductionQaInvitationProof({
  confirmed: process.env.PRODUCTION_QA_INVITATION_CONFIRM === "1",
  environment: process.env.HALAALVEST_ENV ?? "local",
  qaDomain: process.env.PRODUCTION_QA_DOMAIN ?? "ishaq.qa.test",
  runId:
    process.env.PRODUCTION_QA_RUN_ID ??
    `invitation-${new Date()
      .toISOString()
      .replace(/[^0-9]/g, "")
      .slice(0, 14)}`,
})

console.log(JSON.stringify(receipt, null, 2))
