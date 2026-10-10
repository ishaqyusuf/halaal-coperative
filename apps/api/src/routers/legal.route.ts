import { z } from "zod"
import {
  acceptPlatformDocuments,
  getPublishedLegalBundle,
  listOwnLegalAcceptances,
} from "@halaalvest/db"
import { createTRPCRouter, publicProcedure, tenantProcedure } from "../lib.trpc"
export const legalRouter = createTRPCRouter({
  current: publicProcedure.query(() => getPublishedLegalBundle()),
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
