import { z } from "zod"
import {
  accountDeletionNoticeCopy,
  privacyCompletionEmailCopy,
} from "@halaalvest/domain/account-privacy-notice"
import {
  ACCOUNT_DELETION_NOTICE_VERSION,
  PRIVACY_PROCESSING_CATEGORIES,
  cancelOwnPrivacyRequest,
  erasePrivacyRequestPersonalData,
  finishPrivacyRequest,
  recordPrivacyCompletionNoticeFailed,
  getPrivacyProcessingInventory,
  getPrivacyRequestForOperator,
  getPrivacyRevocationScope,
  listOwnPrivacyRequests,
  listPrivacyQueue,
  requestAccountDeletion,
  recordPrivacyProcessingNote,
  revokePrivacyRequestAccount,
  verifyPrivacyRequest,
} from "@halaalvest/db"
import {
  authenticatedProcedure,
  createTRPCRouter,
  platformOwnerProcedure,
  tenantProcedure,
} from "../lib.trpc"
import { createNotificationEmailDraft } from "@halaalvest/notifications"
import { createServerNotificationService } from "@halaalvest/notifications/server"
import { localPlatformRootDomain, platformRootDomain } from "@halaalvest/utils"

const requestId = z.object({ requestId: z.string().uuid() })
// tRPC infinite queries add `direction` to the input; strict inputs must allow it.
const queueInput = z
  .object({
    cursor: z.string().min(1).max(300).nullish(),
    direction: z.enum(["forward", "backward"]).optional(),
  })
  .strict()

function privacyNoticeUrl() {
  return process.env.NODE_ENV === "production"
    ? `https://${platformRootDomain}/privacy`
    : `https://${localPlatformRootDomain}/privacy`
}

/**
 * Sends the "your deletion is complete" email. It goes straight to the
 * transport, not `sendEmailDraftWithAudit`: that audit stores the recipient
 * address, which is exactly what the completion erases.
 */
async function sendPrivacyCompletionEmail(input: {
  contactEmail: string
  requestId: string
  retentionSummary: string
  tenantName: string | null
}) {
  const copy = privacyCompletionEmailCopy
  const draft = createNotificationEmailDraft({
    notificationType: "privacy_account_deletion_completed",
    eventLabel: copy.eventLabel,
    subject: copy.subject,
    previewText: copy.previewText,
    bodyText: copy.bodyText,
    actionLabel: copy.actionLabel,
    actionUrl: privacyNoticeUrl(),
    details: [
      { label: copy.referenceLabel, value: input.requestId },
      ...(input.tenantName
        ? [{ label: copy.cooperativeLabel, value: input.tenantName }]
        : []),
      { label: copy.retainedLabel, value: input.retentionSummary },
    ],
    recipient: {
      kind: "email",
      email: input.contactEmail,
      value: input.contactEmail,
    },
  })
  const delivery = await createServerNotificationService().tryEmail(draft)
  return delivery.status === "sent"
}

// Privacy access must not depend on a paid software plan or financial readiness.
export const accountPrivacyRouter = createTRPCRouter({
  notice: authenticatedProcedure.query(() => ({
    version: ACCOUNT_DELETION_NOTICE_VERSION,
    ...accountDeletionNoticeCopy,
  })),
  list: authenticatedProcedure.query(({ ctx }) =>
    listOwnPrivacyRequests(ctx.auth.session!.user.id)
  ),
  request: tenantProcedure
    .input(
      z
        .object({
          idempotencyKey: z.string().uuid(),
          noticeVersion: z.literal(ACCOUNT_DELETION_NOTICE_VERSION),
          confirmed: z.literal(true),
        })
        .strict()
    )
    .mutation(({ ctx, input }) =>
      requestAccountDeletion({
        tenantId: ctx.tenant.current.id,
        userId: ctx.auth.session.user.id,
        idempotencyKey: input.idempotencyKey,
        noticeVersion: input.noticeVersion,
      })
    ),
  cancel: authenticatedProcedure
    .input(requestId.strict())
    .mutation(({ ctx, input }) =>
      cancelOwnPrivacyRequest({
        userId: ctx.auth.session!.user.id,
        requestId: input.requestId,
      })
    ),
  operatorQueue: platformOwnerProcedure
    .input(queueInput)
    .query(({ ctx, input }) =>
      listPrivacyQueue({
        actorUserId: ctx.auth.session.user.id,
        cursor: input.cursor,
      })
    ),
  operatorRequest: platformOwnerProcedure
    .input(requestId.strict())
    .query(({ ctx, input }) =>
      getPrivacyRequestForOperator({
        actorUserId: ctx.auth.session.user.id,
        requestId: input.requestId,
      })
    ),
  processingInventory: platformOwnerProcedure
    .input(requestId.strict())
    .query(({ ctx, input }) =>
      getPrivacyProcessingInventory({
        actorUserId: ctx.auth.session.user.id,
        requestId: input.requestId,
      })
    ),
  recordProcessingNote: platformOwnerProcedure
    .input(
      requestId
        .extend({
          category: z.enum(PRIVACY_PROCESSING_CATEGORIES),
          evidence: z.string().trim().min(20).max(2000),
        })
        .strict()
    )
    .mutation(({ ctx, input }) =>
      recordPrivacyProcessingNote({
        actorUserId: ctx.auth.session.user.id,
        ...input,
      })
    ),
  verify: platformOwnerProcedure
    .input(
      requestId
        .extend({
          verificationEvidence: z.string().trim().min(20).max(2000),
        })
        .strict()
    )
    .mutation(({ ctx, input }) =>
      verifyPrivacyRequest({
        actorUserId: ctx.auth.session.user.id,
        ...input,
      })
    ),
  revocationScope: platformOwnerProcedure
    .input(requestId.strict())
    .query(({ ctx, input }) =>
      getPrivacyRevocationScope({
        actorUserId: ctx.auth.session.user.id,
        requestId: input.requestId,
      })
    ),
  revokeAccess: platformOwnerProcedure
    .input(
      requestId
        .extend({
          confirmed: z.literal(true),
          handoverAndRetentionEvidence: z.string().trim().min(20).max(2000),
          reviewedMemberships: z
            .array(
              z
                .object({
                  id: z.string().uuid(),
                  tenantId: z.string().uuid(),
                  role: z.string().min(1).max(40),
                })
                .strict()
            )
            .max(1000),
        })
        .strict()
    )
    .mutation(({ ctx, input }) =>
      revokePrivacyRequestAccount({
        actorUserId: ctx.auth.session.user.id,
        requestId: input.requestId,
        handoverAndRetentionEvidence: input.handoverAndRetentionEvidence,
        reviewedMemberships: input.reviewedMemberships,
      })
    ),
  // Finishing a request (ADR-20261116 privacy request completion): erase,
  // tell the person, then mark it done. A failed email leaves the request
  // open with personal details already erased; the operator can retry or
  // record another way they told the person.
  complete: platformOwnerProcedure
    .input(
      requestId
        .extend({
          confirmed: z.literal(true),
          retentionSummary: z.string().trim().min(20).max(2000),
          operatorConfirmationNote: z
            .string()
            .trim()
            .min(20)
            .max(2000)
            .optional(),
        })
        .strict()
    )
    .mutation(async ({ ctx, input }) => {
      const actorUserId = ctx.auth.session.user.id
      const erased = await erasePrivacyRequestPersonalData({
        actorUserId,
        requestId: input.requestId,
        retentionSummary: input.retentionSummary,
      })
      if (input.operatorConfirmationNote) {
        const done = await finishPrivacyRequest({
          actorUserId,
          requestId: input.requestId,
          confirmation: {
            method: "operator",
            note: input.operatorConfirmationNote,
          },
        })
        return { ...done, confirmation: "operator" as const }
      }
      const sent = erased.contactEmail
        ? await sendPrivacyCompletionEmail({
            contactEmail: erased.contactEmail,
            requestId: erased.requestId,
            retentionSummary: erased.retentionSummary,
            tenantName: erased.tenantName,
          })
        : false
      if (!sent) {
        await recordPrivacyCompletionNoticeFailed({
          actorUserId,
          requestId: input.requestId,
        })
        return {
          completed: false as const,
          confirmation: erased.contactEmail
            ? ("email_failed" as const)
            : ("no_contact" as const),
        }
      }
      const done = await finishPrivacyRequest({
        actorUserId,
        requestId: input.requestId,
        confirmation: { method: "email" },
      })
      return { ...done, confirmation: "email" as const }
    }),
})
