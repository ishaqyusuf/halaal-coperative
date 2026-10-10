import { revokeMobileDeviceSession } from "@halaalvest/db"
import type {
  ProductionQaHarnessPlan,
  ProductionQaHarnessRole,
} from "@halaalvest/domain"

import { buildRequestContext } from "../context"
import { createCallerFactory } from "../lib.trpc"
import { appRouter } from "../routers/_app"
import { runWithProductionQaTesterCredential } from "./production-qa-tester-credential"

const createCaller = createCallerFactory(appRouter)

function productionQaHeaders(input: {
  authorization?: string
  deviceId?: string
  mobile?: boolean
}) {
  return new Headers({
    ...(input.authorization
      ? { authorization: `Bearer ${input.authorization}` }
      : {}),
    host: "api.halaalvest.localhost",
    ...(input.deviceId
      ? {
          "x-mobile-app-version": "ticket-30-proof",
          "x-mobile-build-variant": "local-qa",
          "x-mobile-device-id": input.deviceId,
          "x-mobile-device-label": "Ticket 30 headless Android proof",
          "x-mobile-platform": "android",
        }
      : {}),
    ...(input.mobile ? { "x-trpc-source": "mobile" } : {}),
  })
}

export type ProductionQaMobileSessionCleanup = {
  mobileSessionRevoked: boolean
  mobileSessionRevocationMethod: "direct_fallback" | "none" | "sign_out"
  mobileSessionSignOutCode:
    | "BAD_REQUEST"
    | "CONFLICT"
    | "FORBIDDEN"
    | "INTERNAL_SERVER_ERROR"
    | "NOT_FOUND"
    | "NOT_ATTEMPTED"
    | "PASSED"
    | "UNAUTHORIZED"
    | "UNKNOWN"
  testerCredentialRevoked: boolean
}

export type ProductionQaMobileSessionContext = {
  activeMembershipId: string
  activateReplacementSession: (profile: { token: string }) => Promise<{
    caller: ReturnType<typeof createCaller>
    previousSessionRevoked: true
  }>
  availableRoles: Array<{
    id: string
    role: string
    workspaceRole: string
  }>
  caller: ReturnType<typeof createCaller>
  cooperativeRole: string | null | undefined
  tenantId: string
}

export async function executeWithProductionQaSessionCleanup<T>(input: {
  cleanup: () => Promise<void>
  execute: () => Promise<T>
}) {
  try {
    return await input.execute()
  } finally {
    await input.cleanup()
  }
}

function boundedCleanupCode(
  error: unknown
): Exclude<
  ProductionQaMobileSessionCleanup["mobileSessionSignOutCode"],
  "NOT_ATTEMPTED" | "PASSED"
> {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "UNKNOWN"
  return [
    "BAD_REQUEST",
    "CONFLICT",
    "FORBIDDEN",
    "INTERNAL_SERVER_ERROR",
    "NOT_FOUND",
    "UNAUTHORIZED",
  ].includes(code)
    ? (code as Exclude<
        ProductionQaMobileSessionCleanup["mobileSessionSignOutCode"],
        "NOT_ATTEMPTED" | "PASSED" | "UNKNOWN"
      >)
    : "UNKNOWN"
}

export async function runWithProductionQaMobileSession<T>(input: {
  deviceId: string
  execute: (context: ProductionQaMobileSessionContext) => Promise<T>
  plan: ProductionQaHarnessPlan
  role: ProductionQaHarnessRole
  scenarioKey: string
  testerLabel: string
}): Promise<{
  cleanup: ProductionQaMobileSessionCleanup
  result: T
}> {
  const targetScenario = input.plan.scenarios.find(
    ({ key }) => key === input.scenarioKey
  )
  if (!targetScenario) {
    throw new Error("The requested production QA scenario is missing.")
  }

  let mobileCaller: ReturnType<typeof createCaller> | null = null
  let mobileSession: {
    id: string
    tenantId: string
    token: string
    userId: string
  } | null = null
  const cleanup: ProductionQaMobileSessionCleanup = {
    mobileSessionRevoked: false,
    mobileSessionRevocationMethod: "none",
    mobileSessionSignOutCode: "NOT_ATTEMPTED",
    testerCredentialRevoked: false,
  }

  const credentialSession = await runWithProductionQaTesterCredential({
    execute: async ({ credential }) => {
      return executeWithProductionQaSessionCleanup({
        execute: async () => {
          const publicCaller = createCaller(
            await buildRequestContext(
              productionQaHeaders({ deviceId: input.deviceId, mobile: true })
            )
          )
          const authorization = await publicCaller.qaAccelerator.authorize({
            clientId: input.deviceId,
            clientKind: "mobile",
            contractVersion: 1,
            credential,
            qaDomain: input.plan.qaDomain,
          })
          const profiles = await publicCaller.qaAccelerator.profiles({
            authorizationToken: authorization.authorizationToken,
            clientId: input.deviceId,
            clientKind: "mobile",
            contractVersion: 1,
          })
          const targetProfile = profiles.profiles.find(
            (profile) =>
              profile.cooperativeName === targetScenario.name &&
              profile.role === input.role
          )
          if (!targetProfile) {
            throw new Error(
              "The requested production QA profile is unavailable."
            )
          }

          const entered = await publicCaller.qaAccelerator.enterProfile({
            authorizationToken: authorization.authorizationToken,
            clientId: input.deviceId,
            clientKind: "mobile",
            contractVersion: 1,
            selectionRef: targetProfile.selectionRef,
          })
          if (entered.clientKind !== "mobile") {
            throw new Error(
              "The QA accelerator did not issue a mobile session."
            )
          }

          const mobileContext = await buildRequestContext(
            productionQaHeaders({
              authorization: entered.profile.token,
              deviceId: input.deviceId,
              mobile: true,
            })
          )
          const durableSessionId =
            mobileContext.auth.session?.mobileDeviceSessionId
          const sessionUserId = mobileContext.auth.session?.user.id
          if (
            !durableSessionId ||
            !sessionUserId ||
            !mobileContext.tenant.current
          ) {
            throw new Error(
              "The QA accelerator session was not recognized as a durable mobile session."
            )
          }
          mobileSession = {
            id: durableSessionId,
            tenantId: mobileContext.tenant.current.id,
            token: entered.profile.token,
            userId: sessionUserId,
          }
          mobileCaller = createCaller(mobileContext)

          return await input.execute({
            activeMembershipId: entered.profile.activeMembershipId,
            activateReplacementSession: async (profile) => {
              if (!mobileSession) {
                throw new Error(
                  "A current mobile session is required before replacement."
                )
              }
              const previousSession = mobileSession
              const replacementContext = await buildRequestContext(
                productionQaHeaders({
                  authorization: profile.token,
                  deviceId: input.deviceId,
                  mobile: true,
                })
              )
              const replacementSessionId =
                replacementContext.auth.session?.mobileDeviceSessionId
              const replacementUserId = replacementContext.auth.session?.user.id
              const replacementTenant = replacementContext.tenant.current
              if (
                !replacementSessionId ||
                !replacementUserId ||
                !replacementTenant ||
                replacementUserId !== previousSession.userId ||
                replacementTenant.id !== previousSession.tenantId
              ) {
                throw new Error(
                  "The replacement profile did not resolve the expected durable mobile session."
                )
              }

              mobileSession = {
                id: replacementSessionId,
                tenantId: replacementTenant.id,
                token: profile.token,
                userId: replacementUserId,
              }
              mobileCaller = createCaller(replacementContext)

              const previousContext = await buildRequestContext(
                productionQaHeaders({
                  authorization: previousSession.token,
                  deviceId: input.deviceId,
                  mobile: true,
                })
              )
              if (previousContext.auth.session) {
                throw new Error(
                  "The prior mobile session remained active after replacement."
                )
              }

              return {
                caller: mobileCaller,
                previousSessionRevoked: true,
              }
            },
            availableRoles: entered.profile.availableRoles,
            caller: mobileCaller,
            cooperativeRole: entered.profile.cooperativeRole,
            tenantId: entered.profile.tenant.id,
          })
        },
        cleanup: async () => {
          if (mobileCaller) {
            try {
              await mobileCaller.auth.mobile.signOut()
              cleanup.mobileSessionRevoked = true
              cleanup.mobileSessionRevocationMethod = "sign_out"
              cleanup.mobileSessionSignOutCode = "PASSED"
            } catch (error) {
              cleanup.mobileSessionSignOutCode = boundedCleanupCode(error)
              if (mobileSession) {
                try {
                  await revokeMobileDeviceSession({
                    actorUserId: mobileSession.userId,
                    reason: "signed_out",
                    sessionId: mobileSession.id,
                    tenantId: mobileSession.tenantId,
                    userId: mobileSession.userId,
                  })
                  cleanup.mobileSessionRevoked = true
                  cleanup.mobileSessionRevocationMethod = "direct_fallback"
                } catch {
                  cleanup.mobileSessionRevoked = false
                  cleanup.mobileSessionRevocationMethod = "none"
                }
              }
            }
          }
        },
      })
    },
    qaDomain: input.plan.qaDomain,
    testerLabel: input.testerLabel,
  })

  cleanup.testerCredentialRevoked =
    credentialSession.cleanup.testerCredentialRevoked
  return { cleanup, result: credentialSession.result }
}
