import type { MemberPurchaseSource } from "@halaalvest/domain"

import type { PrismaClient } from "../../generated/prisma/client"
import {
  foodPurchaseReleaseInput,
  postMemberPurchaseRepayment,
  procurementReleaseInput,
  syncMemberPurchaseProfitIntoSeason,
} from "./member-purchase-postings"

/** One procurement or foodstuff receipt allocation, with what was paid before it. */
export type MemberPurchaseReceiptRepayment = {
  allocationId: string
  amount: number
  /** Repaid on the request or application before this allocation. */
  paidBefore: number
  source: MemberPurchaseSource
  sourceId: string
}

/**
 * Posts an approved receipt's procurement and foodstuff allocations to the
 * general ledger, then carries any newly earned markup into the profit books.
 * Goods released before this flow existed get their release posted first, at
 * the original release date.
 */
export async function postMemberPurchaseReceiptAllocations(
  input: {
    actorUserId: string
    memberId: string
    paidAt: Date
    reference: string | null
    repayments: MemberPurchaseReceiptRepayment[]
    tenantId: string
  },
  tx: PrismaClient
) {
  if (!input.repayments.length) return

  let earned = 0
  for (const repayment of input.repayments) {
    const releaseIfMissing =
      repayment.source === "procurement"
        ? await procurementReleaseInput(
            {
              procurementRequestId: repayment.sourceId,
              tenantId: input.tenantId,
            },
            tx
          )
        : await foodPurchaseReleaseInput(
            {
              applicationId: repayment.sourceId,
              releasedAt: input.paidAt,
              releasedByUserId: input.actorUserId,
              tenantId: input.tenantId,
            },
            tx
          )

    // The sub-ledger already holds this allocation, so what was repaid
    // before it is `paidBefore`, not the stored paid amount.
    releaseIfMissing.priorPaid = repayment.paidBefore

    const result = await postMemberPurchaseRepayment(
      {
        actorUserId: input.actorUserId,
        allocationId: repayment.allocationId,
        amount: repayment.amount,
        memberId: input.memberId,
        paidAt: input.paidAt,
        paidBefore: repayment.paidBefore,
        reference: input.reference,
        releaseIfMissing,
        source: repayment.source,
        sourceId: repayment.sourceId,
        tenantId: input.tenantId,
      },
      tx
    )
    earned += result.earnedMarkup

    if (repayment.source === "food_purchase") {
      // Paid before the month was closed: the goods count as released now.
      await tx.foodPurchaseApplication.updateMany({
        data: {
          goodsReleasedAt: releaseIfMissing.releasedAt,
          goodsReleasedByUserId: releaseIfMissing.releasedByUserId,
        },
        where: {
          goodsReleasedAt: null,
          id: repayment.sourceId,
          tenantId: input.tenantId,
        },
      })
    }
  }

  if (earned > 0) {
    // The season hand-off is dated today (ADR-016: profit is dated when it
    // is recorded, inside the current season), whatever the receipt date.
    await syncMemberPurchaseProfitIntoSeason(
      { asOf: new Date(), tenantId: input.tenantId },
      tx
    )
  }
}
