import { z } from "zod"
import { accountDeletionNoticeCopy } from "@halaalvest/domain/account-privacy-notice"
import {
  ACCOUNT_DELETION_NOTICE_VERSION,
  PRIVACY_PROCESSING_CATEGORIES,
  cancelOwnPrivacyRequest,
  getPrivacyProcessingInventory,
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

const requestId = z.object({ requestId: z.string().uuid() })

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
    .input(z.object({ cursor: z.string().min(1).max(300).nullish() }).strict())
    .query(({ ctx, input }) =>
      listPrivacyQueue({
        actorUserId: ctx.auth.session.user.id,
        cursor: input.cursor,
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
})
