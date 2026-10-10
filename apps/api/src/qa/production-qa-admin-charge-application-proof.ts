import {
  createPrismaClient,
  ensureProductionQaDuplicateChargeFixture,
  PRODUCTION_QA_DUPLICATE_CHARGE_FIXTURE,
  type ProductionQaDuplicateChargeFixtureResult,
} from "@halaalvest/db"
import {
  createProductionQaHarnessPlan,
  createProductionQaJourneyExecutionReport,
  executeProductionQaPositiveJourneys,
  type ProductionQaExecutionReceipt,
  type ProductionQaJourneyExecutionAdapter,
  type ProductionQaStepAdapterResult,
} from "@halaalvest/domain"
import { randomUUID } from "node:crypto"

import {
  cleanupProductionQaDuplicateChargeArtifacts,
  PRODUCTION_QA_DUPLICATE_CHARGE_ANDROID_NOTE,
  readProductionQaDuplicateChargeFingerprint,
  type ProductionQaDuplicateChargeFingerprint,
} from "./production-qa-duplicate-charge-proof"
import {
  runWithProductionQaMobileSession,
  type ProductionQaMobileSessionCleanup,
} from "./production-qa-mobile-session"

const JOURNEY = "admin-charge-application"

export const PRODUCTION_QA_ADMIN_CHARGE_API_NOTE =
  "QA ONLY — admin charge positive API proof."
export const PRODUCTION_QA_ADMIN_CHARGE_ANDROID_NOTE =
  PRODUCTION_QA_DUPLICATE_CHARGE_ANDROID_NOTE

type ChargeCommandInput = {
  assessedAt: string
  basisAmount: number | null
  chargeDefinitionId: string
  commandId: string
  expectedAmount: number
  expectedState: string
  memberId: string
  notes: string
}

type ChargeCommandResult = {
  commandId: string
  entityId: string
  replayed: boolean
  state: string
}

type ChargeFormOptions = {
  definitions: { id: string; rate: number }[]
  members: { id: string }[]
}

type ChargeWorkspace = {
  capabilities: { manage: boolean; view: boolean }
  currencyCode: string
  lane: string
}

export type ProductionQaAdminChargeCaller = {
  applyCharge: (input: ChargeCommandInput) => Promise<ChargeCommandResult>
  formOptions: (input: { search?: string }) => Promise<ChargeFormOptions>
  workspace: (input: { lane: "applications" }) => Promise<ChargeWorkspace>
}

export type ProductionQaAdminChargeEvidence = {
  android: ProductionQaDuplicateChargeFingerprint | null
  api: ProductionQaDuplicateChargeFingerprint | null
}

function hasOneChargeEffect(
  fingerprint: ProductionQaDuplicateChargeFingerprint
) {
  return (
    fingerprint.applicationCount === 1 &&
    fingerprint.ledgerTransactionCount === 1 &&
    fingerprint.ledgerEntryCount === 2
  )
}

export function createProductionQaAdminChargeApplicationAdapter(input: {
  androidCheckpoint?: () => Promise<ProductionQaStepAdapterResult>
  caller: ProductionQaAdminChargeCaller
  command: ChargeCommandInput
  fixture: ProductionQaDuplicateChargeFixtureResult
  onEvidence?: (evidence: ProductionQaAdminChargeEvidence) => void
  prepareAndroidCheckpoint: () => Promise<boolean>
  readFingerprint: (
    notes: string
  ) => Promise<ProductionQaDuplicateChargeFingerprint>
}): ProductionQaJourneyExecutionAdapter {
  let apiApplied = false
  let workspaceReady = false
  const evidence: ProductionQaAdminChargeEvidence = {
    android: null,
    api: null,
  }
  const publishEvidence = () => input.onEvidence?.(structuredClone(evidence))
  const fail = () => ({ code: "ASSERTION_FAILED", status: "failed" }) as const

  return {
    executeStep: async ({ journey, step }) => {
      if (journey.key !== JOURNEY) return fail()

      if (step.surface === "android") {
        if (!apiApplied || !(await input.prepareAndroidCheckpoint())) {
          return fail()
        }
        if (!input.androidCheckpoint) {
          return {
            code: "ANDROID_CHECKPOINT_UNAVAILABLE",
            status: "blocked",
          }
        }
        const checkpoint = await input.androidCheckpoint()
        if (checkpoint.status !== "passed") return checkpoint
        evidence.android = await input.readFingerprint(
          PRODUCTION_QA_ADMIN_CHARGE_ANDROID_NOTE
        )
        publishEvidence()
        return hasOneChargeEffect(evidence.android)
          ? { status: "passed" }
          : fail()
      }

      if (step.contract === "mobile.admin.charges.workspace") {
        const workspace = await input.caller.workspace({
          lane: "applications",
        })
        const options = await input.caller.formOptions({})
        workspaceReady =
          workspace.lane === "applications" &&
          workspace.currencyCode === "NGN" &&
          workspace.capabilities.view &&
          workspace.capabilities.manage &&
          options.definitions.some(
            ({ id, rate }) =>
              id === input.fixture.chargeDefinitionId &&
              rate === PRODUCTION_QA_DUPLICATE_CHARGE_FIXTURE.amount
          ) &&
          options.members.some(({ id }) => id === input.fixture.member.id)
        return workspaceReady
          ? { status: "passed" }
          : { code: "FIXTURE_MISSING", status: "blocked" }
      }

      if (step.contract === "mobile.admin.charges.applyCharge") {
        if (!workspaceReady) return fail()
        const before = await input.readFingerprint(input.command.notes)
        if (
          before.applicationCount !== 0 ||
          before.ledgerTransactionCount !== 0 ||
          before.ledgerEntryCount !== 0
        ) {
          return { code: "FIXTURE_MISSING", status: "blocked" }
        }

        const result = await input.caller.applyCharge(input.command)
        const after = await input.readFingerprint(input.command.notes)
        evidence.api = after
        publishEvidence()
        apiApplied =
          result.commandId === input.command.commandId &&
          !result.replayed &&
          result.state === "posted" &&
          after.applicationIds.includes(result.entityId) &&
          hasOneChargeEffect(after) &&
          after.memberSavings ===
            before.memberSavings - PRODUCTION_QA_DUPLICATE_CHARGE_FIXTURE.amount
        return apiApplied ? { status: "passed" } : fail()
      }

      return { code: "FIXTURE_MISSING", status: "blocked" }
    },
  }
}

export async function runProductionQaAdminChargeApplicationProof(input: {
  androidCheckpoint?: () => Promise<ProductionQaStepAdapterResult>
  environment: string
  qaDomain: string
  runId: string
}) {
  const plan = createProductionQaHarnessPlan(input)
  const prisma = createPrismaClient()
  if (!prisma) throw new Error("Admin-charge proof requires the QA database.")
  const fixture = await ensureProductionQaDuplicateChargeFixture({
    plan,
    prisma,
  })
  const commandId = randomUUID()
  const command: ChargeCommandInput = {
    assessedAt: new Date().toISOString(),
    basisAmount: null,
    chargeDefinitionId: fixture.chargeDefinitionId,
    commandId,
    expectedAmount: PRODUCTION_QA_DUPLICATE_CHARGE_FIXTURE.amount,
    expectedState: "available",
    memberId: fixture.member.id,
    notes: PRODUCTION_QA_ADMIN_CHARGE_API_NOTE,
  }

  await cleanupProductionQaDuplicateChargeArtifacts({
    fixture,
    notes: PRODUCTION_QA_ADMIN_CHARGE_API_NOTE,
    prisma,
  })
  await cleanupProductionQaDuplicateChargeArtifacts({
    fixture,
    notes: PRODUCTION_QA_ADMIN_CHARGE_ANDROID_NOTE,
    prisma,
  })
  const baseline = await readProductionQaDuplicateChargeFingerprint({
    fixture,
    notes: PRODUCTION_QA_ADMIN_CHARGE_API_NOTE,
    prisma,
  })
  let evidence: ProductionQaAdminChargeEvidence = {
    android: null,
    api: null,
  }
  let session:
    | {
        cleanup: ProductionQaMobileSessionCleanup
        result: ProductionQaExecutionReceipt
      }
    | undefined
  let finalCleanupRestored = false

  try {
    session =
      await runWithProductionQaMobileSession<ProductionQaExecutionReceipt>({
        deviceId: `ticket-30-admin-charge-${plan.runId}`,
        execute: async ({ caller }) =>
          executeProductionQaPositiveJourneys({
            adapter: createProductionQaAdminChargeApplicationAdapter({
              androidCheckpoint: input.androidCheckpoint,
              caller: caller.mobile.admin.charges,
              command,
              fixture,
              onEvidence: (nextEvidence) => {
                evidence = nextEvidence
              },
              prepareAndroidCheckpoint: async () => {
                await cleanupProductionQaDuplicateChargeArtifacts({
                  commandId,
                  fixture,
                  notes: PRODUCTION_QA_ADMIN_CHARGE_API_NOTE,
                  prisma,
                })
                const clean = await readProductionQaDuplicateChargeFingerprint({
                  fixture,
                  notes: PRODUCTION_QA_ADMIN_CHARGE_API_NOTE,
                  prisma,
                })
                return (
                  clean.applicationCount === 0 &&
                  clean.ledgerTransactionCount === 0 &&
                  clean.ledgerEntryCount === 0 &&
                  clean.memberSavings === baseline.memberSavings
                )
              },
              readFingerprint: (notes) =>
                readProductionQaDuplicateChargeFingerprint({
                  fixture,
                  notes,
                  prisma,
                }),
            }),
            journeyKeys: [JOURNEY],
            plan,
          }),
        plan,
        role: "finance_officer",
        scenarioKey: "starter-healthy",
        testerLabel: `Ticket 30 admin charge ${plan.runId}`,
      })
  } finally {
    await cleanupProductionQaDuplicateChargeArtifacts({
      commandId,
      fixture,
      notes: PRODUCTION_QA_ADMIN_CHARGE_API_NOTE,
      prisma,
    })
    await cleanupProductionQaDuplicateChargeArtifacts({
      fixture,
      notes: PRODUCTION_QA_ADMIN_CHARGE_ANDROID_NOTE,
      prisma,
    })
    const finalState = await readProductionQaDuplicateChargeFingerprint({
      fixture,
      notes: PRODUCTION_QA_ADMIN_CHARGE_API_NOTE,
      prisma,
    })
    finalCleanupRestored =
      finalState.applicationCount === 0 &&
      finalState.ledgerTransactionCount === 0 &&
      finalState.ledgerEntryCount === 0 &&
      finalState.memberSavings === baseline.memberSavings
  }

  if (!session) throw new Error("Admin-charge proof did not run.")
  return {
    cleanup: session.cleanup,
    commandId,
    complete:
      session.result.journeys[0]?.status === "passed" &&
      Boolean(evidence.api && hasOneChargeEffect(evidence.api)) &&
      Boolean(evidence.android && hasOneChargeEffect(evidence.android)) &&
      finalCleanupRestored &&
      session.cleanup.mobileSessionRevoked &&
      session.cleanup.testerCredentialRevoked,
    evidence,
    finalCleanupRestored,
    fixture,
    receipt: session.result,
    report: createProductionQaJourneyExecutionReport(session.result),
  }
}
