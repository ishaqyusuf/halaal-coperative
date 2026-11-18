import type { PrismaClient } from "../../generated/prisma/client"
import { ExpectedQueryError } from "../query-error"

/**
 * Monthly commitments entered during setup (triage 1.8).
 *
 * Before go-live the owner can set members' monthly commitments, so a
 * cooperative can go live with lending capacity. Such a commitment is marked
 * `startsAtGoLive`: it starts on the first day of the month the cooperative
 * goes live. Until then `startsAt` holds the first day of the month it was
 * entered (so the go-live checklist counts it), and going live moves it to
 * the go-live month. Nothing is posted and no month before go-live is due.
 */

/** First day (UTC) of the month `date` falls in: the financing-cycle month. */
export function getCommitmentMonthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

type SetupCommitmentTx = Pick<
  PrismaClient,
  "auditLog" | "contributionPlan" | "member"
>

export type SetGoLiveContributionPlanInput = {
  actorUserId: string
  amount: number
  memberId: string
  name?: string
  /** Defaults to now; tests pin it. */
  now?: Date
  tenantId: string
}

/**
 * Sets a member's commitment while the cooperative is still in setup. A
 * second save replaces the amount of the setup commitment in place: nothing
 * has taken effect yet, so there is no history to keep. An earlier
 * commitment (dated history entered with the member) ends where this one
 * starts.
 */
export async function setGoLiveContributionPlanInTransaction(
  input: SetGoLiveContributionPlanInput,
  tx: SetupCommitmentTx,
  assertReductionAllowed: (input: {
    currentAmount: number
    nextAmount: number
  }) => Promise<void>
) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw ExpectedQueryError.validation(
      "Monthly commitment must be more than ₦0."
    )
  }

  const member = await tx.member.findFirst({
    select: { id: true },
    where: { id: input.memberId, tenantId: input.tenantId },
  })

  if (!member) {
    throw ExpectedQueryError.notFound("Member not found.")
  }

  const startsAt = getCommitmentMonthStart(input.now ?? new Date())
  const name = input.name?.trim() || "Monthly commitment"
  const activePlan = await tx.contributionPlan.findFirst({
    select: { amount: true, id: true, startsAtGoLive: true },
    where: {
      isActive: true,
      memberId: input.memberId,
      tenantId: input.tenantId,
    },
  })

  if (activePlan) {
    await assertReductionAllowed({
      currentAmount: Number(activePlan.amount),
      nextAmount: input.amount,
    })
  }

  const plan = activePlan?.startsAtGoLive
    ? await tx.contributionPlan.update({
        data: { amount: input.amount, name },
        where: { id: activePlan.id, tenantId: input.tenantId },
      })
    : await (async () => {
        if (activePlan) {
          await tx.contributionPlan.updateMany({
            data: { endsAt: startsAt, isActive: false },
            where: {
              isActive: true,
              memberId: input.memberId,
              tenantId: input.tenantId,
            },
          })
        }

        return tx.contributionPlan.create({
          data: {
            amount: input.amount,
            interval: "monthly",
            isActive: true,
            memberId: input.memberId,
            name,
            startsAt,
            startsAtGoLive: true,
            tenantId: input.tenantId,
          },
        })
      })()

  await tx.auditLog.create({
    data: {
      action: "contribution_plan.set",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: plan.id,
      entityType: "ContributionPlan",
      metadata: {
        amount: input.amount,
        memberId: input.memberId,
        startsAt: startsAt.toISOString(),
        startsAtGoLive: true,
      },
      occurredAt: new Date(),
      tenantId: input.tenantId,
    },
  })

  return plan
}

type AnchorPrisma = Pick<PrismaClient, "$transaction" | "contributionPlan">

/**
 * Called by go-live before the cooperative becomes live: every commitment
 * entered during setup now starts on the first day of the go-live month,
 * and the dated commitment it replaced ends there. Idempotent.
 */
export async function anchorSetupCommitmentsToGoLive(
  input: { goLiveAt: Date; tenantId: string },
  prisma: AnchorPrisma
) {
  if (typeof prisma.contributionPlan?.findMany !== "function") {
    return { movedPlanCount: 0 }
  }

  const goLiveMonthStart = getCommitmentMonthStart(input.goLiveAt)
  const plans = await prisma.contributionPlan.findMany({
    select: { id: true, memberId: true, startsAt: true },
    where: {
      startsAt: { lt: goLiveMonthStart },
      startsAtGoLive: true,
      tenantId: input.tenantId,
    },
  })

  if (plans.length === 0) {
    return { movedPlanCount: 0 }
  }

  await prisma.$transaction(async (tx) => {
    for (const plan of plans) {
      // The commitment this one replaced ended where it started.
      const replaced = await tx.contributionPlan.findFirst({
        orderBy: { startsAt: "desc" },
        select: { id: true },
        where: {
          endsAt: plan.startsAt,
          id: { not: plan.id },
          memberId: plan.memberId,
          tenantId: input.tenantId,
        },
      })

      if (replaced) {
        await tx.contributionPlan.update({
          data: { endsAt: goLiveMonthStart },
          where: { id: replaced.id, tenantId: input.tenantId },
        })
      }

      await tx.contributionPlan.update({
        data: { startsAt: goLiveMonthStart },
        where: { id: plan.id, tenantId: input.tenantId },
      })
    }
  })

  return { movedPlanCount: plans.length }
}
