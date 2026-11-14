import { z } from "zod"
import {
  getStoreRefundReview,
  listPendingStoreRefundReviews,
} from "@halaalvest/db"
import { createTRPCRouter, platformOwnerProcedure } from "../lib.trpc"

export const storeRefundReviewsRouter = createTRPCRouter({
  queue: platformOwnerProcedure
    .input(
      z
        .object({
          cursor: z.string().min(1).max(300).nullish(),
          // Added by tRPC infinite queries.
          direction: z.enum(["forward", "backward"]).optional(),
        })
        .strict()
    )
    .query(({ ctx, input }) =>
      listPendingStoreRefundReviews({
        actorUserId: ctx.auth.session.user.id,
        cursor: input.cursor,
      })
    ),
  review: platformOwnerProcedure
    .input(z.object({ reviewId: z.string().uuid() }).strict())
    .query(({ ctx, input }) =>
      getStoreRefundReview({
        actorUserId: ctx.auth.session.user.id,
        reviewId: input.reviewId,
      })
    ),
})
