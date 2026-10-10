import {
  createProductionQaHarnessPlan,
  createProductionQaNegativeJourneyExecutionReport,
  executeProductionQaNegativeJourneys,
  type ProductionQaNegativeJourneyExecutionAdapter,
  type ProductionQaNegativeExecutionReceipt,
  type ProductionQaNegativeStepAdapterResult,
} from "@halaalvest/domain"
import {
  createPrismaClient,
  ensureProductionQaDuplicateChargeFixture,
  PRODUCTION_QA_DUPLICATE_CHARGE_FIXTURE,
  type ProductionQaDuplicateChargeFixtureResult,
} from "@halaalvest/db"
import { randomUUID } from "node:crypto"

import {
  runWithProductionQaMobileSession,
  type ProductionQaMobileSessionCleanup,
} from "./production-qa-mobile-session"

const JOURNEY = "duplicate-charge-command"
type PrismaClient = NonNullable<ReturnType<typeof createPrismaClient>>
export const PRODUCTION_QA_DUPLICATE_CHARGE_API_NOTE =
  "QA ONLY — duplicate charge API replay proof."
export const PRODUCTION_QA_DUPLICATE_CHARGE_ANDROID_NOTE =
  "QA charge operation reviewed against the member record and effective rule."

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

export type ProductionQaDuplicateChargeCaller = {
  applyCharge: (input: ChargeCommandInput) => Promise<ChargeCommandResult>
}

export type ProductionQaDuplicateChargeFingerprint = {
  applicationCount: number
  applicationIds: string[]
  fingerprint: string
  ledgerEntryCount: number
  ledgerTransactionCount: number
  memberSavings: number
}

export type ProductionQaDuplicateChargeEvidence = {
  android: ProductionQaDuplicateChargeFingerprint | null
  api: {
    firstEntityId: string | null
    firstReplayed: boolean | null
    replayEntityId: string | null
    replayed: boolean | null
    stableFingerprint: boolean
  }
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

export async function readProductionQaDuplicateChargeFingerprint(input: {
  fixture: ProductionQaDuplicateChargeFixtureResult
  notes: string
  prisma: PrismaClient
}): Promise<ProductionQaDuplicateChargeFingerprint> {
  // The QA runner intentionally uses one adapter client. Keep these reads
  // sequential so the proof does not rely on unsupported concurrent queries.
  const applications = await input.prisma.chargeApplication.findMany({
    include: {
      ledgerTransaction: {
        include: { entries: { select: { id: true } } },
      },
    },
    orderBy: { id: "asc" },
    where: {
      chargeDefinitionId: input.fixture.chargeDefinitionId,
      memberId: input.fixture.member.id,
      notes: input.notes,
      tenantId: input.fixture.tenantId,
    },
  })
  const member = await input.prisma.member.findFirst({
    select: { totalSavingsSnapshot: true },
    where: {
      id: input.fixture.member.id,
      tenantId: input.fixture.tenantId,
    },
  })
  if (!member) throw new Error("Duplicate-charge QA member disappeared.")

  const applicationIds = applications.map(({ id }) => id)
  const ledgerTransactions = applications.flatMap((application) =>
    application.ledgerTransaction ? [application.ledgerTransaction] : []
  )
  const value = {
    applicationIds,
    ledgerEntryIds: ledgerTransactions.flatMap(({ entries }) =>
      entries.map(({ id }) => id)
    ),
    ledgerTransactionIds: ledgerTransactions.map(({ id }) => id),
    memberSavings: Number(member.totalSavingsSnapshot),
  }

  return {
    applicationCount: applications.length,
    applicationIds,
    fingerprint: JSON.stringify(value),
    ledgerEntryCount: value.ledgerEntryIds.length,
    ledgerTransactionCount: value.ledgerTransactionIds.length,
    memberSavings: value.memberSavings,
  }
}

export async function cleanupProductionQaDuplicateChargeArtifacts(input: {
  commandId?: string
  fixture: ProductionQaDuplicateChargeFixtureResult
  notes: string
  prisma: PrismaClient
}) {
  return input.prisma.$transaction(async (transaction) => {
    const applications = await transaction.chargeApplication.findMany({
      include: { ledgerTransaction: { select: { id: true } } },
      where: {
        chargeDefinitionId: input.fixture.chargeDefinitionId,
        memberId: input.fixture.member.id,
        notes: input.notes,
        tenantId: input.fixture.tenantId,
      },
    })
    const applicationIds = applications.map(({ id }) => id)
    const ledgerTransactionIds = applications.flatMap((application) =>
      application.ledgerTransaction ? [application.ledgerTransaction.id] : []
    )
    const commandAudits = await transaction.auditLog.findMany({
      select: { id: true, metadata: true },
      where: {
        entityId: input.fixture.member.id,
        entityType: "MobileAdminCommand",
        tenantId: input.fixture.tenantId,
      },
    })
    const commandAuditIds = commandAudits
      .filter(({ metadata }) => {
        const value = metadata as Record<string, unknown> | null
        return (
          value?.commandType === "charge_application.apply" &&
          ((typeof value.resultEntityId === "string" &&
            applicationIds.includes(value.resultEntityId)) ||
            (input.commandId && value.commandId === input.commandId))
        )
      })
      .map(({ id }) => id)
    const restoredSavings = applications.reduce(
      (total, application) =>
        total +
        (application.collectionMode === "deduct_from_savings" &&
        application.status === "posted"
          ? Number(application.amount)
          : 0),
      0
    )

    if (ledgerTransactionIds.length > 0) {
      await transaction.ledgerEntry.deleteMany({
        where: {
          ledgerTransactionId: { in: ledgerTransactionIds },
          tenantId: input.fixture.tenantId,
        },
      })
      await transaction.ledgerTransaction.deleteMany({
        where: {
          id: { in: ledgerTransactionIds },
          tenantId: input.fixture.tenantId,
        },
      })
    }
    if (applicationIds.length > 0 || commandAuditIds.length > 0) {
      await transaction.auditLog.deleteMany({
        where: {
          OR: [
            ...(applicationIds.length > 0
              ? [{ entityId: { in: applicationIds } }]
              : []),
            ...(commandAuditIds.length > 0
              ? [{ id: { in: commandAuditIds } }]
              : []),
          ],
          tenantId: input.fixture.tenantId,
        },
      })
    }
    if (applicationIds.length > 0) {
      await transaction.chargeApplication.deleteMany({
        where: {
          id: { in: applicationIds },
          tenantId: input.fixture.tenantId,
        },
      })
    }
    if (restoredSavings > 0) {
      await transaction.member.update({
        data: { totalSavingsSnapshot: { increment: restoredSavings } },
        where: {
          id: input.fixture.member.id,
          tenantId: input.fixture.tenantId,
        },
      })
    }

    return {
      applicationsRemoved: applicationIds.length,
      commandAuditsRemoved: commandAuditIds.length,
      ledgerTransactionsRemoved: ledgerTransactionIds.length,
      restoredSavings,
    }
  })
}

export function createProductionQaDuplicateChargeAdapter(input: {
  androidCheckpoint?: () => Promise<ProductionQaNegativeStepAdapterResult>
  androidNotes: string
  caller: ProductionQaDuplicateChargeCaller
  command: ChargeCommandInput
  cooperativeRole: string | null | undefined
  onEvidence?: (evidence: ProductionQaDuplicateChargeEvidence) => void
  prepareAndroidCheckpoint: () => Promise<boolean>
  readFingerprint: (
    notes: string
  ) => Promise<ProductionQaDuplicateChargeFingerprint>
}): ProductionQaNegativeJourneyExecutionAdapter {
  let firstResult: ChargeCommandResult | null = null
  let firstFingerprint: ProductionQaDuplicateChargeFingerprint | null = null
  const evidence: ProductionQaDuplicateChargeEvidence = {
    android: null,
    api: {
      firstEntityId: null,
      firstReplayed: null,
      replayEntityId: null,
      replayed: null,
      stableFingerprint: false,
    },
  }
  const publishEvidence = () => input.onEvidence?.(evidence)

  return {
    verifySuppressedStep: async () => ({
      code: "TRANSPORT_UNAVAILABLE",
      status: "blocked",
    }),
    executeInvokedStep: async ({ journey, step }) => {
      if (
        journey.key !== JOURNEY ||
        input.cooperativeRole !== "finance_officer"
      ) {
        return { code: "AUTHORIZATION_REQUIRED", status: "failed" }
      }

      if (step.surface === "android") {
        if (!firstResult || !firstFingerprint) {
          return { code: "ASSERTION_FAILED", status: "failed" }
        }
        if (!input.androidCheckpoint) {
          return {
            code: "ANDROID_CHECKPOINT_UNAVAILABLE",
            status: "blocked",
          }
        }
        if (!(await input.prepareAndroidCheckpoint())) {
          return { code: "ASSERTION_FAILED", status: "failed" }
        }
        const checkpoint = await input.androidCheckpoint()
        if (checkpoint.status !== "observed") return checkpoint
        const androidFingerprint = await input.readFingerprint(
          input.androidNotes
        )
        evidence.android = androidFingerprint
        publishEvidence()
        return hasOneChargeEffect(androidFingerprint)
          ? { observedOutcome: "IDEMPOTENT_REPLAY", status: "observed" }
          : { code: "ASSERTION_FAILED", status: "failed" }
      }

      if (step.contract !== "mobile.admin.charges.applyCharge") {
        return { code: "TRANSPORT_UNAVAILABLE", status: "blocked" }
      }

      if (step.key === "apply-charge") {
        const before = await input.readFingerprint(input.command.notes)
        if (
          before.applicationCount !== 0 ||
          before.ledgerTransactionCount !== 0 ||
          before.ledgerEntryCount !== 0
        ) {
          return { code: "FIXTURE_MISSING", status: "failed" }
        }
        const result = await input.caller.applyCharge(input.command)
        const after = await input.readFingerprint(input.command.notes)
        evidence.api.firstEntityId = result.entityId
        evidence.api.firstReplayed = result.replayed
        firstResult = result
        firstFingerprint = after
        publishEvidence()
        return !result.replayed && hasOneChargeEffect(after)
          ? { observedOutcome: "SUCCESS", status: "observed" }
          : { code: "ASSERTION_FAILED", status: "failed" }
      }

      if (step.key === "replay-charge" && firstResult && firstFingerprint) {
        const replay = await input.caller.applyCharge(input.command)
        const afterReplay = await input.readFingerprint(input.command.notes)
        const stableFingerprint =
          afterReplay.fingerprint === firstFingerprint.fingerprint
        evidence.api.replayEntityId = replay.entityId
        evidence.api.replayed = replay.replayed
        evidence.api.stableFingerprint = stableFingerprint
        publishEvidence()
        return replay.replayed &&
          replay.entityId === firstResult.entityId &&
          stableFingerprint &&
          hasOneChargeEffect(afterReplay)
          ? { observedOutcome: "IDEMPOTENT_REPLAY", status: "observed" }
          : { code: "ASSERTION_FAILED", status: "failed" }
      }

      return { code: "ASSERTION_FAILED", status: "failed" }
    },
  }
}

export async function runProductionQaDuplicateChargeProof(input: {
  androidCheckpoint?: () => Promise<ProductionQaNegativeStepAdapterResult>
  environment: string
  qaDomain: string
  runId: string
}) {
  const plan = createProductionQaHarnessPlan(input)
  const prisma = createPrismaClient()
  if (!prisma) {
    throw new Error("Duplicate-charge proof requires the QA database.")
  }
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
    notes: PRODUCTION_QA_DUPLICATE_CHARGE_API_NOTE,
  }

  await cleanupProductionQaDuplicateChargeArtifacts({
    fixture,
    notes: PRODUCTION_QA_DUPLICATE_CHARGE_API_NOTE,
    prisma,
  })
  await cleanupProductionQaDuplicateChargeArtifacts({
    fixture,
    notes: PRODUCTION_QA_DUPLICATE_CHARGE_ANDROID_NOTE,
    prisma,
  })
  const baseline = await readProductionQaDuplicateChargeFingerprint({
    fixture,
    notes: PRODUCTION_QA_DUPLICATE_CHARGE_API_NOTE,
    prisma,
  })
  let evidence: ProductionQaDuplicateChargeEvidence = {
    android: null,
    api: {
      firstEntityId: null,
      firstReplayed: null,
      replayEntityId: null,
      replayed: null,
      stableFingerprint: false,
    },
  }
  let session:
    | {
        cleanup: ProductionQaMobileSessionCleanup
        result: ProductionQaNegativeExecutionReceipt
      }
    | undefined
  let finalCleanupRestored = false

  try {
    session =
      await runWithProductionQaMobileSession<ProductionQaNegativeExecutionReceipt>(
        {
          deviceId: `ticket-30-duplicate-charge-${plan.runId}`,
          execute: async ({ caller, cooperativeRole }) =>
            executeProductionQaNegativeJourneys({
              adapter: createProductionQaDuplicateChargeAdapter({
                androidCheckpoint: input.androidCheckpoint,
                androidNotes: PRODUCTION_QA_DUPLICATE_CHARGE_ANDROID_NOTE,
                caller: caller.mobile.admin.charges,
                command,
                cooperativeRole,
                onEvidence: (nextEvidence) => {
                  evidence = structuredClone(nextEvidence)
                },
                prepareAndroidCheckpoint: async () => {
                  await cleanupProductionQaDuplicateChargeArtifacts({
                    commandId,
                    fixture,
                    notes: PRODUCTION_QA_DUPLICATE_CHARGE_API_NOTE,
                    prisma,
                  })
                  const clean =
                    await readProductionQaDuplicateChargeFingerprint({
                      fixture,
                      notes: PRODUCTION_QA_DUPLICATE_CHARGE_API_NOTE,
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
          testerLabel: `Ticket 30 duplicate charge ${plan.runId}`,
        }
      )
  } finally {
    await cleanupProductionQaDuplicateChargeArtifacts({
      commandId,
      fixture,
      notes: PRODUCTION_QA_DUPLICATE_CHARGE_API_NOTE,
      prisma,
    })
    await cleanupProductionQaDuplicateChargeArtifacts({
      fixture,
      notes: PRODUCTION_QA_DUPLICATE_CHARGE_ANDROID_NOTE,
      prisma,
    })
    const finalState = await readProductionQaDuplicateChargeFingerprint({
      fixture,
      notes: PRODUCTION_QA_DUPLICATE_CHARGE_API_NOTE,
      prisma,
    })
    finalCleanupRestored =
      finalState.applicationCount === 0 &&
      finalState.ledgerTransactionCount === 0 &&
      finalState.ledgerEntryCount === 0 &&
      finalState.memberSavings === baseline.memberSavings
  }

  if (!session) throw new Error("Duplicate-charge proof did not run.")
  return {
    cleanup: session.cleanup,
    commandId,
    complete:
      session.result.journeys[0]?.status === "passed" &&
      evidence.api.firstReplayed === false &&
      evidence.api.replayed === true &&
      evidence.api.stableFingerprint &&
      hasOneChargeEffect(
        evidence.android ?? {
          applicationCount: 0,
          applicationIds: [],
          fingerprint: "",
          ledgerEntryCount: 0,
          ledgerTransactionCount: 0,
          memberSavings: 0,
        }
      ) &&
      finalCleanupRestored &&
      session.cleanup.mobileSessionRevoked &&
      session.cleanup.testerCredentialRevoked,
    evidence,
    finalCleanupRestored,
    fixture,
    receipt: session.result,
    report: createProductionQaNegativeJourneyExecutionReport(session.result),
  }
}
