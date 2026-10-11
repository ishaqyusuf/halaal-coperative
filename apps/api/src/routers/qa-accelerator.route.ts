import {
  createSignedSessionTokenBundle,
  hashQaAcceleratorEvidence,
  platformSessionScope,
} from "@halaalvest/auth"
import {
  authorizeQaClient,
  authorizeQaDomainClient,
  createQaTesterCredential,
  getQaAuthorizationByToken,
  listQaAccessProfiles,
  revokeQaTesterCredential,
} from "@halaalvest/db"
import { normalizeQaDomain } from "@halaalvest/domain"
import { TRPCError } from "@trpc/server"
import { randomBytes } from "node:crypto"
import {
  platformOwnerProcedure,
  createTRPCRouter,
  publicProcedure,
} from "../lib.trpc"
import {
  getConfiguredLocalQaCredential,
  isConfiguredQaEntryDomain,
  getQaAcceleratorCapability,
} from "../qa-accelerator-config"
import {
  qaAuthorizationInput,
  qaAuthorizeInput,
  qaCapabilityInput,
  qaEnterProfileInput,
  qaIssueCredentialInput,
  qaRevokeCredentialInput,
} from "../schemas/qa-accelerator"
import { issueMobileProfile } from "./mobile-auth-profile"
import { enforcePublicAuthLimits } from "./mobile-account-access.route"

function randomCredential(prefix: string) {
  return `${prefix}_${randomBytes(32).toString("hex")}`
}

export function randomQaTesterCredential() {
  return BigInt(`0x${randomBytes(32).toString("hex")}`)
    .toString(10)
    .padStart(78, "0")
}

function requireCapability(input: {
  clientKind: "mobile" | "web"
  contractVersion: number
}) {
  const capability = getQaAcceleratorCapability(input)
  if (!capability.available) {
    throw new TRPCError({
      code:
        capability.status === "upgrade-required"
          ? "PRECONDITION_FAILED"
          : "NOT_FOUND",
      message:
        capability.status === "upgrade-required"
          ? "This QA client must be upgraded before it can continue."
          : "QA access is unavailable.",
    })
  }
  return capability
}

function clientSignal(
  input: { clientId: string },
  ctx: {
    request: {
      deviceSignal: string
      host: string | null
      networkSignal: string
    }
  }
) {
  return hashQaAcceleratorEvidence(
    `qa-client:${input.clientId}:${ctx.request.deviceSignal}:${ctx.request.host ?? "no-host"}:${ctx.request.networkSignal}`
  )
}

async function requireAuthorization(
  input: {
    authorizationToken: string
    clientId: string
    clientKind: "mobile" | "web"
    contractVersion: number
  },
  ctx: Parameters<typeof clientSignal>[1]
) {
  const capability = requireCapability(input)
  const authorization = await getQaAuthorizationByToken({
    clientSignalHash: clientSignal(input, ctx),
    tokenHash: hashQaAcceleratorEvidence(
      `qa-authorization:${input.authorizationToken}`
    ),
  })
  if (
    !authorization ||
    authorization.clientKind !== input.clientKind ||
    authorization.contractVersion !== capability.contractVersion ||
    authorization.environment !== capability.environment
  ) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "QA authorization is invalid, expired, or revoked.",
    })
  }
  return authorization
}

function selectionRef(authorizationId: string, membershipId: string) {
  return hashQaAcceleratorEvidence(
    `qa-selection:${authorizationId}:${membershipId}`
  )
}

export const qaAcceleratorRouter = createTRPCRouter({
  capability: publicProcedure
    .input(qaCapabilityInput)
    .query(({ input }) => getQaAcceleratorCapability(input)),

  issueCredential: platformOwnerProcedure
    .input(qaIssueCredentialInput)
    .mutation(async ({ ctx, input }) => {
      requireCapability({ clientKind: "web", contractVersion: 1 })
      const qaDomain = normalizeQaDomain(input.qaDomain)
      const credential = randomQaTesterCredential()
      const created = await createQaTesterCredential({
        createdByUserId: ctx.auth.session.user.id,
        credentialDigest: hashQaAcceleratorEvidence(
          `qa-credential:${credential}`
        ),
        expiresAt: new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000),
        qaDomain,
        testerLabel: input.testerLabel,
      })
      return { credential, credentialId: created.id, qaDomain }
    }),

  revokeCredential: platformOwnerProcedure
    .input(qaRevokeCredentialInput)
    .mutation(async ({ input }) => {
      await revokeQaTesterCredential(input)
      return { ok: true as const }
    }),

  authorize: publicProcedure
    .input(qaAuthorizeInput)
    .mutation(async ({ ctx, input }) => {
      const capability = requireCapability(input)
      const qaDomain = normalizeQaDomain(input.qaDomain)
      if (ctx.runtime.status === "database-configured") {
        await enforcePublicAuthLimits({
          account: qaDomain,
          ctx,
          device: input.clientId,
          operation: "qa_accelerator_authorize",
        })
      }
      const authorizationToken = randomCredential("hqa_auth")
      const configuredCredential = getConfiguredLocalQaCredential()
      if (!input.credential && !isConfiguredQaEntryDomain(qaDomain)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "This domain is not set up for QA on this server.",
        })
      }
      const common = {
        clientKind: input.clientKind,
        clientSignalHash: clientSignal(input, ctx),
        contractVersion: capability.contractVersion,
        environment: capability.environment,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
        qaDomain,
        tokenHash: hashQaAcceleratorEvidence(
          `qa-authorization:${authorizationToken}`
        ),
      }
      const authorization = !input.credential
        ? await authorizeQaDomainClient({
            ...common,
            receiptDigest: hashQaAcceleratorEvidence(
              `qa-domain-entry:${qaDomain}:${input.clientKind}:${common.clientSignalHash}:${Math.floor(Date.now() / (8 * 60 * 60 * 1000))}`
            ),
          })
        : await authorizeQaClient({
            clientKind: input.clientKind,
            clientSignalHash: clientSignal(input, ctx),
            contractVersion: capability.contractVersion,
            credentialDigest: hashQaAcceleratorEvidence(
              `qa-credential:${input.credential}`
            ),
            environment: capability.environment,
            expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
            fallbackCredentialDigest: configuredCredential
              ? hashQaAcceleratorEvidence(
                  `qa-credential:${configuredCredential}`
                )
              : null,
            qaDomain,
            tokenHash: hashQaAcceleratorEvidence(
              `qa-authorization:${authorizationToken}`
            ),
          })
      if (!authorization) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "The QA Domain could not be authorized.",
        })
      }
      return {
        authorizationToken,
        expiresAt: authorization.expiresAt.toISOString(),
        qaDomain: authorization.qaDomain,
      }
    }),

  profiles: publicProcedure
    .input(qaAuthorizationInput)
    .query(async ({ ctx, input }) => {
      const authorization = await requireAuthorization(input, ctx)
      const profiles = await listQaAccessProfiles(authorization.qaDomain)
      return {
        expiresAt: authorization.expiresAt.toISOString(),
        profiles: profiles.map((profile) => ({
          cooperativeName: profile.tenant.name,
          eligible:
            profile.membership.role !== "member" || Boolean(profile.member),
          identityLabel: profile.user.fullName,
          memberCode: profile.member?.code ?? null,
          role: profile.membership.role,
          selectionRef: selectionRef(authorization.id, profile.membership.id),
        })),
        qaDomain: authorization.qaDomain,
      }
    }),

  enterProfile: publicProcedure
    .input(qaEnterProfileInput)
    .mutation(async ({ ctx, input }) => {
      const authorization = await requireAuthorization(input, ctx)
      const profiles = await listQaAccessProfiles(authorization.qaDomain)
      const profile = profiles.find(
        (candidate) =>
          selectionRef(authorization.id, candidate.membership.id) ===
          input.selectionRef
      )
      if (
        !profile ||
        (profile.membership.role === "member" && !profile.member)
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "That QA profile is no longer eligible.",
        })
      }
      if (input.clientKind === "mobile") {
        return {
          clientKind: "mobile" as const,
          profile: await issueMobileProfile({
            device: {
              ...ctx.request.mobile,
              deviceId: ctx.request.deviceSignal,
            },
            expiresAt: authorization.expiresAt.getTime(),
            membership: profile.membership,
            qaAuthorizationId: authorization.id,
            runtimeStatus: ctx.runtime.status,
            tenant: profile.tenant,
            user: profile.user,
          }),
        }
      }
      const { token } = await createSignedSessionTokenBundle({
        expiresAt: authorization.expiresAt.getTime(),
        membershipId: profile.membership.id,
        qaAuthorizationId: authorization.id,
        scope: ctx.request.sessionScope ?? platformSessionScope,
        tenantId: profile.tenant.id,
        userId: profile.user.id,
      })
      return {
        clientKind: "web" as const,
        cooperativeSlug: profile.tenant.slug,
        sessionToken: token,
        userId: profile.user.id,
      }
    }),
})
