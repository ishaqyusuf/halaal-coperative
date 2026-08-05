import { createHmac, timingSafeEqual } from "node:crypto"
import {
  adoptQaTenantCandidates,
  createQaPurgeRun,
  discoverQaTenantCandidates,
  getQaMaintenancePreview,
  getQaPurgeRun,
} from "@halaalvest/db"
import { AppError } from "@halaalvest/errors"
import {
  previewQaUploads,
  getQaHostingCredentialBlocker,
  qaPurgeHandler,
  qaPurgeTask,
  triggerJob,
} from "@halaalvest/jobs"
import { getServerQaEmailDomains } from "@halaalvest/notifications/server"
import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { createTRPCRouter, platformOwnerProcedure } from "../lib.trpc"

export const QA_PURGE_CONFIRMATION = "PURGE ALL QA DATA"
const previewTtlMs = 10 * 60 * 1_000

function getMaintenanceSecret() {
  const secret =
    process.env.QA_MAINTENANCE_SECRET?.trim() ?? process.env.AUTH_SECRET?.trim()

  if (secret) return secret
  if (process.env.NODE_ENV !== "production") {
    return "development-only-qa-maintenance-secret"
  }

  throw new AppError({
    code: "UNEXPECTED",
    internalMessage:
      "QA_MAINTENANCE_SECRET or AUTH_SECRET is required in production.",
    operation: "qaMaintenance.secret",
  })
}

function signPreview(fingerprint: string, expiresAt: number) {
  const payload = `${expiresAt}.${fingerprint}`
  const signature = createHmac("sha256", getMaintenanceSecret())
    .update(payload)
    .digest("hex")

  return `${payload}.${signature}`
}

function verifyPreviewToken(token: string, fingerprint: string) {
  const [expiresAtValue, signedFingerprint, signature] = token.split(".")
  const expiresAt = Number(expiresAtValue)

  if (
    !expiresAtValue ||
    !signedFingerprint ||
    !signature ||
    signedFingerprint !== fingerprint ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= Date.now()
  ) {
    return false
  }

  const expected = signPreview(signedFingerprint, expiresAt).split(".").at(-1)
  const expectedBuffer = Buffer.from(expected ?? "")
  const actualBuffer = Buffer.from(signature)

  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  )
}

async function buildPreview() {
  const preview = await getQaMaintenancePreview()
  const uploads = await previewQaUploads(
    preview.tenants.map((tenant) => tenant.id)
  )
  const credentialBlocker = getQaHostingCredentialBlocker()

  return {
    ...preview,
    blockers: credentialBlocker
      ? [
          ...preview.blockers,
          {
            category: "required_provider_credential" as const,
            tenantId: "platform-hosting",
            tenantName: "Vercel project",
          },
        ]
      : preview.blockers,
    counts: {
      ...preview.counts,
      ...uploads,
    },
  }
}

export const qaMaintenanceRouter = createTRPCRouter({
  candidates: platformOwnerProcedure.query(() =>
    discoverQaTenantCandidates(getServerQaEmailDomains())
  ),

  adopt: platformOwnerProcedure
    .input(z.object({ tenantIds: z.array(z.uuid()).min(1) }))
    .mutation(({ input }) =>
      adoptQaTenantCandidates({
        domains: getServerQaEmailDomains(),
        tenantIds: input.tenantIds,
      })
    ),

  preview: platformOwnerProcedure.query(async () => {
    const preview = await buildPreview()
    const expiresAt = Date.now() + previewTtlMs

    return {
      ...preview,
      previewExpiresAt: new Date(expiresAt).toISOString(),
      previewToken: signPreview(preview.fingerprint, expiresAt),
    }
  }),

  startPurge: platformOwnerProcedure
    .input(
      z.object({
        confirmation: z.literal(QA_PURGE_CONFIRMATION),
        previewToken: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const preview = await buildPreview()

      if (!verifyPreviewToken(input.previewToken, preview.fingerprint)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "The QA purge preview expired or changed. Preview again.",
        })
      }
      if (preview.tenants.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "There are no marked QA workspaces to purge.",
        })
      }
      if (preview.blockers.length > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Resolve all live provider blockers before purging QA data.",
        })
      }

      const run = await createQaPurgeRun(ctx.auth.session.user.id)
      await triggerJob(
        qaPurgeTask,
        async (payload) => {
          await qaPurgeHandler(payload)
        },
        { runId: run.id }
      )

      return run
    }),

  run: platformOwnerProcedure
    .input(z.object({ runId: z.uuid() }))
    .query(({ input }) => getQaPurgeRun(input.runId)),
})
