import {
  createAuthEvidenceCode,
  hashAuthEvidence,
  hashAuthRateLimitSignal,
  hashPassword,
} from "@halaalvest/auth"
import {
  completeMobilePasswordRecovery,
  createAuthChallenge,
  enforceAuthRateLimits,
  findTenantByCooperativeCodePrefixAsync,
  findUserByCooperativeAccessCodeAsync,
} from "@halaalvest/db"
import { AppError } from "@halaalvest/errors"
import { createNotificationEmailDraft } from "@halaalvest/notifications"
import { TRPCError } from "@trpc/server"
import { z } from "zod"

import { createTRPCRouter, publicProcedure } from "../lib.trpc"
import { sendEmailDraftWithAudit } from "../lib/server-notifications"
import { captureApiNotificationError } from "../observability/sentry"
import { issueMobileProfile } from "./mobile-auth-profile"

const deviceIdSchema = z.string().trim().min(8).max(180)
const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/)
const strongPasswordSchema = z
  .string()
  .min(8)
  .max(128)
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), {
    message: "Use at least one letter and one number.",
  })
const uuidSchema = z.string().uuid()
const cooperativeNumberSchema = z.string().trim().min(3).max(96)

export const neutralRecoveryResponse = {
  message:
    "If an active account matches those details, a six-digit recovery code will be sent.",
  requested: true as const,
}

export function projectRecoveryRequestResponse(input: {
  challengeId: string
  devCode?: string
  exposeDevCode: boolean
}) {
  return {
    ...neutralRecoveryResponse,
    challengeId: input.challengeId,
    ...(input.exposeDevCode && input.devCode ? { devCode: input.devCode } : {}),
  }
}

export function shouldNeutralizeRecoveryRateLimit(error: unknown) {
  return error instanceof AppError && error.code === "RATE_LIMITED"
}

function buildMobileAuthUrl(input: {
  params: Record<string, string>
  route: "recovery"
}) {
  const configuredScheme = process.env.HALAALVEST_MOBILE_URL_SCHEME?.trim()
  const scheme = configuredScheme || "halaalvest"
  const query = new URLSearchParams(input.params)
  return `${scheme}://${input.route}?${query.toString()}`
}

export function getPublicAuthRateLimitRules(input: {
  account?: string | null
  device: string
  network: string
  tenantId?: string | null
}) {
  return [
    ...(input.account
      ? [
          {
            limit: 6,
            signalHash: hashAuthRateLimitSignal(input.account),
            signalType: "account" as const,
            windowMs: 15 * 60 * 1000,
          },
        ]
      : []),
    {
      limit: 20,
      signalHash: hashAuthRateLimitSignal(input.device),
      signalType: "device" as const,
      windowMs: 15 * 60 * 1000,
    },
    {
      limit: 40,
      signalHash: hashAuthRateLimitSignal(input.network),
      signalType: "network" as const,
      windowMs: 15 * 60 * 1000,
    },
    ...(input.tenantId
      ? [
          {
            limit: 120,
            signalHash: hashAuthRateLimitSignal(input.tenantId),
            signalType: "tenant" as const,
            windowMs: 15 * 60 * 1000,
          },
        ]
      : []),
  ]
}

async function findPublicTenantByCooperativeNumber(cooperativeNumber: string) {
  const prefix = cooperativeNumber.trim().toUpperCase().split("-")[0]
  return findTenantByCooperativeCodePrefixAsync(prefix)
}

export async function enforcePublicAuthLimits(input: {
  account?: string | null
  ctx: {
    request: { deviceSignal: string; networkSignal: string }
  }
  device?: string
  operation: string
  tenantId?: string | null
}) {
  await enforceAuthRateLimits({
    operation: input.operation,
    rules: getPublicAuthRateLimitRules({
      account: input.account,
      device: input.device ?? input.ctx.request.deviceSignal,
      network: input.ctx.request.networkSignal,
      tenantId: input.tenantId,
    }),
    tenantId: input.tenantId,
  })
}

export async function enforceTenantAuthLimit(input: {
  neutralOnRateLimit?: boolean
  operation: string
  tenantId: string
}) {
  try {
    await enforceAuthRateLimits({
      operation: input.operation,
      rules: [
        {
          limit: 120,
          signalHash: hashAuthRateLimitSignal(input.tenantId),
          signalType: "tenant",
          windowMs: 15 * 60 * 1000,
        },
      ],
      tenantId: input.tenantId,
    })
    return true as const
  } catch (error) {
    if (
      input.neutralOnRateLimit &&
      shouldNeutralizeRecoveryRateLimit(error)
    ) {
      return false as const
    }
    throw error
  }
}

export const mobileRecoveryRouter = createTRPCRouter({
  request: publicProcedure
    .input(
      z.object({
        cooperativeNumber: cooperativeNumberSchema,
        deviceId: deviceIdSchema,
        email: z.string().email().max(254),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const email = input.email.trim().toLowerCase()
      await enforcePublicAuthLimits({
        account: `${input.cooperativeNumber}:${email}`,
        ctx,
        device: input.deviceId,
        operation: "password_recovery_request",
      })
      const [tenant, user] = await Promise.all([
        findPublicTenantByCooperativeNumber(input.cooperativeNumber),
        findUserByCooperativeAccessCodeAsync(input.cooperativeNumber),
      ])
      const matchingUser =
        tenant && user?.tenantId === tenant.id && user.email === email
          ? user
          : null

      if (!tenant || !matchingUser) {
        return projectRecoveryRequestResponse({
          challengeId: crypto.randomUUID(),
          exposeDevCode: false,
        })
      }
      const tenantAllowed = await enforceTenantAuthLimit({
        neutralOnRateLimit: true,
        operation: "password_recovery_request",
        tenantId: tenant.id,
      })
      if (!tenantAllowed) {
        return projectRecoveryRequestResponse({
          challengeId: crypto.randomUUID(),
          exposeDevCode: false,
        })
      }
      const code = createAuthEvidenceCode()
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
      const challenge = await createAuthChallenge({
        evidenceHash: hashAuthEvidence(code),
        expiresAt,
        purpose: "password_recovery",
        tenantId: tenant.id,
        userId: matchingUser?.id ?? null,
      })
      const bodyText = [
        `Hello ${matchingUser.fullName},`,
        "",
        `Use this six-digit code to reset your ${tenant.name} password: ${code}`,
        `It expires on ${expiresAt.toISOString()}.`,
        "",
        "If you did not request this, you can ignore this email.",
      ].join("\n")
      const draft = createNotificationEmailDraft({
        actionLabel: "Reset password",
        actionUrl: buildMobileAuthUrl({
          params: {
            challenge: challenge.id,
            cooperativeNumber: input.cooperativeNumber,
          },
          route: "recovery",
        }),
        bodyText,
        eventLabel: "auth.password_recovery_requested",
        notificationType: "auth.password_recovery_requested",
        previewText: `Use a secure code to reset your ${tenant.name} password.`,
        recipient: {
          displayName: matchingUser.fullName,
          email: matchingUser.email,
          kind: "email",
          value: matchingUser.email,
        },
        sender: { displayName: tenant.name, localPart: tenant.slug },
        subject: `${tenant.name}: reset your password`,
      })
      try {
        await sendEmailDraftWithAudit({
          draft,
          source: "mobile.password_recovery",
          tenantId: tenant.id,
        })
      } catch (error) {
        captureApiNotificationError(error)
      }

      return projectRecoveryRequestResponse({
        challengeId: challenge.id,
        devCode: code,
        exposeDevCode: process.env.NODE_ENV !== "production",
      })
    }),

  complete: publicProcedure
    .input(
      z.object({
        challengeId: uuidSchema,
        code: otpSchema,
        cooperativeNumber: cooperativeNumberSchema,
        deviceId: deviceIdSchema,
        password: strongPasswordSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      await enforcePublicAuthLimits({
        account: `${input.cooperativeNumber}:${input.challengeId}`,
        ctx,
        device: input.deviceId,
        operation: "password_recovery_complete",
      })
      const tenant = await findPublicTenantByCooperativeNumber(
        input.cooperativeNumber
      )
      if (!tenant) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This code is invalid or no longer available.",
        })
      }
      await enforceTenantAuthLimit({
        operation: "password_recovery_complete",
        tenantId: tenant.id,
      })
      const result = await completeMobilePasswordRecovery({
        challengeId: input.challengeId,
        evidenceHash: hashAuthEvidence(input.code),
        passwordHash: hashPassword(input.password),
        tenantId: tenant.id,
      })
      if (!result.membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This account is not active for the selected cooperative.",
        })
      }
      return {
        profile: await issueMobileProfile({
          device: {
            ...ctx.request.mobile,
            deviceId: ctx.request.deviceSignal,
          },
          membership: result.membership,
          runtimeStatus: ctx.runtime.status,
          tenant,
          user: result.user,
        }),
      }
    }),
})
