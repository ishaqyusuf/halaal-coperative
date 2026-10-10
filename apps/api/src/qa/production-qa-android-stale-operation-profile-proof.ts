import {
  countMobileDeviceSessionRevocations,
  listQaAccessProfiles,
} from "@halaalvest/db"
import { createProductionQaHarnessPlan } from "@halaalvest/domain"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import { ProductionQaAndroidDriver } from "./production-qa-android-driver"
import {
  type ProductionQaOperationProfileCaller,
  runProductionQaStaleOperationProfileProof,
} from "./production-qa-stale-operation-profile-proof"
import { runWithProductionQaTesterCredential } from "./production-qa-tester-credential"

const SERVICE_KEY = "procurement" as const
const BASELINE_MODE = "read_only" as const
const DRIFT_MODE = "office_only" as const

async function readProcurementMode(caller: ProductionQaOperationProfileCaller) {
  const snapshot = await caller.overview()
  return snapshot.services.find((service) => service.serviceKey === SERVICE_KEY)
    ?.accessMode
}

export async function runProductionQaAndroidStaleOperationProfileProof(input: {
  adbPath?: string
  environment: string
  evidenceDirectory: string
  launchUrl?: string | null
  packageName?: string
  qaDomain: string
  runId: string
  serial: string
}) {
  const startedAt = new Date()
  const plan = createProductionQaHarnessPlan(input)
  const scenario = plan.scenarios.find(
    (candidate) => candidate.key === "enterprise-stale"
  )
  const profile = (await listQaAccessProfiles(plan.qaDomain)).find(
    (candidate) =>
      candidate.tenant.name === scenario?.name &&
      candidate.membership.role === "tenant_admin"
  )
  if (!profile) {
    throw new Error("The exact Enterprise stale QA Admin profile is missing.")
  }

  await mkdir(input.evidenceDirectory, { recursive: true })
  const driver = new ProductionQaAndroidDriver(input)
  let androidSignedOut = false
  let checkpointFailure: string | null = null
  let fixtureRestored = false
  let screenshots: string[] = []
  const serverChecks = {
    remainedDriftedAfterConflict: false,
    remainedDriftedAfterRefresh: false,
  }

  const androidCredential = await runWithProductionQaTesterCredential({
    execute: async ({ credential }) => {
      try {
        await driver.enterQaProfile({
          credential,
          expectedRole: "tenant_admin",
          expectedShell: "admin",
          identityLabel: profile.user.fullName,
          qaDomain: plan.qaDomain,
        })

        return await runProductionQaStaleOperationProfileProof({
          androidCheckpoint: async ({ caller }) => {
            let driftCreated = false
            try {
              if ((await readProcurementMode(caller)) !== BASELINE_MODE) {
                return { status: "failed", code: "FIXTURE_MISSING" }
              }

              screenshots = await driver.captureOperationProfileStaleRecovery({
                createServerDrift: async () => {
                  await caller.updateService({
                    changeReason:
                      "QA ONLY — create concurrent Operation Profile drift.",
                    expectedAccessMode: BASELINE_MODE,
                    nextAccessMode: DRIFT_MODE,
                    serviceKey: SERVICE_KEY,
                  })
                  driftCreated = true
                  if ((await readProcurementMode(caller)) !== DRIFT_MODE) {
                    throw new Error(
                      "The concurrent Operation Profile drift was not persisted."
                    )
                  }
                },
                onConflictObserved: async () => {
                  serverChecks.remainedDriftedAfterConflict =
                    (await readProcurementMode(caller)) === DRIFT_MODE
                  if (!serverChecks.remainedDriftedAfterConflict) {
                    throw new Error(
                      "The client retried or changed the stale command automatically."
                    )
                  }
                },
                onRefreshedReview: async () => {
                  serverChecks.remainedDriftedAfterRefresh =
                    (await readProcurementMode(caller)) === DRIFT_MODE
                  if (!serverChecks.remainedDriftedAfterRefresh) {
                    throw new Error(
                      "Refreshing the review unexpectedly changed server state."
                    )
                  }
                },
              })

              return { status: "observed", observedOutcome: "CONFLICT" }
            } catch (error) {
              checkpointFailure =
                error instanceof Error
                  ? error.message
                  : "The Android stale-conflict checkpoint failed."
              try {
                screenshots.push(await driver.captureOperationProfileFailure())
              } catch {
                // Preserve the bounded original failure without native output.
              }
              throw error
            } finally {
              if (driftCreated) {
                try {
                  const currentMode = await readProcurementMode(caller)
                  if (currentMode === DRIFT_MODE) {
                    await caller.updateService({
                      changeReason:
                        "QA ONLY — restore Operation Profile stale fixture.",
                      expectedAccessMode: DRIFT_MODE,
                      nextAccessMode: BASELINE_MODE,
                      serviceKey: SERVICE_KEY,
                    })
                  }
                  fixtureRestored =
                    (await readProcurementMode(caller)) === BASELINE_MODE
                } catch {
                  fixtureRestored = false
                }
              }
            }
          },
          environment: input.environment,
          qaDomain: plan.qaDomain,
          runId: input.runId,
        })
      } finally {
        try {
          await driver.discardOperationProfileTestDraft()
        } catch {
          // Sign-out and server cleanup remain independently required.
        }
        try {
          androidSignedOut = await driver.signOut()
        } catch {
          androidSignedOut = false
        }
      }
    },
    qaDomain: plan.qaDomain,
    testerLabel: `Ticket 30 Android stale Operation Profile ${plan.runId}`,
  })

  const sessions = await countMobileDeviceSessionRevocations({
    createdAtOrAfter: startedAt,
    tenantId: profile.tenant.id,
    userId: profile.user.id,
  })
  const screenshotNames = screenshots.map((file) => path.basename(file))
  const result = {
    android: {
      checkpointFailure,
      packageName: input.packageName ?? "com.halaalvest.mobile",
      serial: input.serial,
      signedOut: androidSignedOut,
    },
    cleanup: {
      androidCredentialRevoked:
        androidCredential.cleanup.testerCredentialRevoked,
      apiSession: androidCredential.result.cleanup,
      fixtureRestored,
      ...sessions,
    },
    complete:
      androidCredential.result.complete &&
      androidSignedOut &&
      androidCredential.cleanup.testerCredentialRevoked &&
      fixtureRestored &&
      serverChecks.remainedDriftedAfterConflict &&
      serverChecks.remainedDriftedAfterRefresh &&
      sessions.sessionCount >= 2 &&
      sessions.sessionCount === sessions.revokedSessionCount &&
      screenshotNames.length === 6,
    completedAt: new Date().toISOString(),
    evidenceDirectory: input.evidenceDirectory,
    receipt: androidCredential.result.receipt,
    report: androidCredential.result.report,
    screenshots: screenshotNames,
    serverChecks,
    startedAt: startedAt.toISOString(),
  }
  await writeFile(
    path.join(input.evidenceDirectory, "receipt.json"),
    JSON.stringify(result, null, 2)
  )
  return result
}
