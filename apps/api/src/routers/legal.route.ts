import { z } from "zod"
import { needsLegalReviewReminder } from "@halaalvest/domain/legal-reminder"
import {
  acceptPlatformDocuments,
  getPublishedLegalBundle,
  listOwnLegalAcceptances,
} from "@halaalvest/db"
import { createTRPCRouter, publicProcedure, tenantProcedure } from "../lib.trpc"
type ReminderDocument = {
  contentHash: string
  documentType: string
  documentVersion: string
}

/**
 * Mobile More asks only "is there something new to review?" (mobile plan
 * M8): the phone never downloads the document bundle for it, and nothing
 * is read from the database while no approved bundle is published.
 */
export async function resolveLegalReminderStatus(input: {
  bundle: { available: boolean; documents: readonly ReminderDocument[] }
  loadRecords: () => Promise<readonly ReminderDocument[]>
}) {
  if (!input.bundle.available || input.bundle.documents.length === 0) {
    return { needsReview: false }
  }
  const records = await input.loadRecords()
  return { needsReview: needsLegalReviewReminder(input.bundle, records) }
}

export const legalRouter = createTRPCRouter({
  current: publicProcedure.query(() => getPublishedLegalBundle()),
  reminderStatus: tenantProcedure.query(({ ctx }) =>
    resolveLegalReminderStatus({
      bundle: getPublishedLegalBundle(),
      loadRecords: () =>
        listOwnLegalAcceptances({
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        }),
    })
  ),
  accepted: tenantProcedure.query(({ ctx }) =>
    listOwnLegalAcceptances({
      tenantId: ctx.tenant.current.id,
      userId: ctx.auth.session.user.id,
    })
  ),
  accept: tenantProcedure
    .input(
      z
        .object({
          surface: z.enum(["web_account", "mobile_account"]),
          acknowledgement: z
            .object({
              confirmed: z.literal(true),
              documents: z
                .array(
                  z
                    .object({
                      documentType: z.enum(["terms", "privacy"]),
                      documentVersion: z.string().min(1).max(80),
                      contentHash: z.string().regex(/^[a-f0-9]{64}$/),
                    })
                    .strict()
                )
                .length(2),
            })
            .strict(),
        })
        .strict()
    )
    .mutation(({ ctx, input }) =>
      acceptPlatformDocuments({
        ...input,
        tenantId: ctx.tenant.current.id,
        userId: ctx.auth.session.user.id,
      })
    ),
})
