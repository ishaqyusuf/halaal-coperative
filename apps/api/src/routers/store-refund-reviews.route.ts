import { z } from "zod"
import { listPendingStoreRefundReviews } from "@halaalvest/db"
import { createTRPCRouter, platformOwnerProcedure } from "../lib.trpc"

export const storeRefundReviewsRouter = createTRPCRouter({
  queue: platformOwnerProcedure
    .input(z.object({ cursor: z.string().min(1).max(300).nullish() }).strict())
    .query(({ ctx, input }) =>
      listPendingStoreRefundReviews({
        actorUserId: ctx.auth.session.user.id,
        cursor: input.cursor,
      })
    ),
})
