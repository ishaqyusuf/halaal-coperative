import {
  createProductionQaHarnessPlan,
  createProductionQaJourneyExecutionReport,
  executeProductionQaPositiveJourneys,
  type ProductionQaJourneyExecutionAdapter,
  type ProductionQaStepAdapterResult,
} from "@halaalvest/domain"
import { z } from "zod"

import { runWithProductionQaMobileSession } from "./production-qa-mobile-session"

const SUBSCRIPTION_STORE_OFFER_JOURNEY = "subscription-store-offer"
const CURRENT_PLAN_CODE = "starter"
const TARGET_PLAN_CODE = "standard"

type SubscriptionPlan = {
  activeMemberLimit: number | null
  code: string
  displayName: string
  entitlements: Record<string, unknown>
  isPublic: boolean
}

type SubscriptionSnapshot = {
  availablePlans: SubscriptionPlan[]
  entitlements: Record<string, unknown>
  invoices: unknown[]
  plan: SubscriptionPlan
  tenantId: string
  usage: {
    activeMemberCount: number
    activeMemberLimit: number | null
  }
}

type StoreCatalog = {
  accountBinding: string | null
  products: {
    store: "apple" | "google"
    productId: string
    planCode: string
    basePlanId?: string
  }[]
}

type ProductionQaSubscriptionCaller = {
  subscriptions: {
    storeCatalog: (input: { store: "google" }) => Promise<StoreCatalog>
    snapshot: () => Promise<SubscriptionSnapshot>
  }
}

type SubscriptionEvidence = {
  currentPlanName: string
  requestedPlanName: string
}

export function createProductionQaStoreOfferAdapter(input: {
  androidCheckpoint?: (
    evidence: SubscriptionEvidence
  ) => Promise<ProductionQaStepAdapterResult>
  caller: ProductionQaSubscriptionCaller
}): ProductionQaJourneyExecutionAdapter {
  let evidence: SubscriptionEvidence | null = null
  let requestedPlan: SubscriptionPlan | null = null

  return {
    executeStep: async ({ step }) => {
      if (step.surface === "android") {
        if (!evidence) return { code: "ASSERTION_FAILED", status: "failed" }
        return input.androidCheckpoint
          ? input.androidCheckpoint(evidence)
          : {
              code: "ANDROID_CHECKPOINT_UNAVAILABLE",
              status: "blocked",
            }
      }

      if (step.contract === "subscriptions.snapshot") {
        const snapshot = await input.caller.subscriptions.snapshot()
        requestedPlan =
          snapshot.availablePlans.find(
            (plan) => plan.code === TARGET_PLAN_CODE
          ) ?? null
        const snapshotIsTruthful =
          snapshot.tenantId.length > 0 &&
          snapshot.plan.code === CURRENT_PLAN_CODE &&
          snapshot.plan.activeMemberLimit ===
            snapshot.usage.activeMemberLimit &&
          snapshot.usage.activeMemberCount >= 0 &&
          Object.keys(snapshot.entitlements).length > 0 &&
          Array.isArray(snapshot.invoices) &&
          requestedPlan?.isPublic === true

        if (!snapshotIsTruthful || !requestedPlan) {
          return { code: "ASSERTION_FAILED", status: "failed" }
        }
        evidence = {
          currentPlanName: snapshot.plan.displayName,
          requestedPlanName: requestedPlan.displayName,
        }
        return { status: "passed" }
      }

      if (step.contract === "subscriptions.storeCatalog") {
        if (!requestedPlan)
          return { code: "FIXTURE_MISSING", status: "blocked" }
        const catalog = await input.caller.subscriptions.storeCatalog({
          store: "google",
        })
        if (!catalog.accountBinding || !catalog.products.length)
          return { code: "FIXTURE_MISSING", status: "blocked" }
        if (!z.uuid().safeParse(catalog.accountBinding).success)
          return { code: "ASSERTION_FAILED", status: "failed" }
        const target = catalog.products.filter(
          (product) => product.planCode === TARGET_PLAN_CODE
        )
        return target.length === 1 &&
          target[0]?.store === "google" &&
          Boolean(target[0].productId.trim()) &&
          Boolean(target[0].basePlanId?.trim())
          ? { status: "passed" }
          : { code: "ASSERTION_FAILED", status: "failed" }
      }

      return { code: "FIXTURE_MISSING", status: "blocked" }
    },
  }
}

export async function runProductionQaStoreOfferProof(input: {
  androidCheckpoint?: (
    evidence: SubscriptionEvidence
  ) => Promise<ProductionQaStepAdapterResult>
  environment: string
  qaDomain: string
  runId: string
}) {
  const plan = createProductionQaHarnessPlan({
    environment: input.environment,
    qaDomain: input.qaDomain,
    runId: input.runId,
  })
  const session = await runWithProductionQaMobileSession({
    deviceId: `ticket-30-subscription-${plan.runId}`,
    execute: async ({ caller }) =>
      executeProductionQaPositiveJourneys({
        adapter: createProductionQaStoreOfferAdapter({
          androidCheckpoint: input.androidCheckpoint,
          caller,
        }),
        journeyKeys: [SUBSCRIPTION_STORE_OFFER_JOURNEY],
        plan,
      }),
    plan,
    role: "tenant_admin",
    scenarioKey: "starter-healthy",
    testerLabel: `Ticket 30 subscription store offer proof ${plan.runId}`,
  })

  return {
    cleanup: session.cleanup,
    complete:
      session.result.journeys[0]?.status === "passed" &&
      session.cleanup.mobileSessionRevoked &&
      session.cleanup.testerCredentialRevoked,
    receipt: session.result,
    report: createProductionQaJourneyExecutionReport(session.result),
  }
}
