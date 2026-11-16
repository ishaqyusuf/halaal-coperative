import { randomUUID } from "node:crypto"
import type { Prisma, PrismaClient } from "../../generated/prisma/client"
import { ExpectedQueryError, QueryInfrastructureError } from "../query-error"
import {
  mobileAccessChargeCode,
  platformSeatFeeChargeCode,
} from "./cooperative-mobile-billing-constants"
import { getTenantMigrationWriteAccess } from "./migration"

/**
 * Batched writer for the contributions, share entries and member charges a
 * member backfill posts (audit L7).
 *
 * `applyBackfillBatch` used to call `recordContribution`,
 * `createMemberShareLedgerEntry` and `applyCharge` once per month, about 25
 * statements a month. It now adds each month here, in the same order and with
 * the same checks, and writes everything with one `createMany` per table at
 * the end of the same transaction. Ids are made here so ledger rows can
 * point at their contribution or charge.
 *
 * The rows written are the ones those functions write for
 * `sourceType: "backfill"` (the live-write guard is skipped for backfill).
 * The running `totalSavingsSnapshot` increments are not repeated: the apply
 * recalculates the snapshot from the posted rows straight afterwards.
 * `backfill-postings.integration.test.ts` posts the same months through
 * both paths and compares every row, so a change to either side shows up
 * there.
 *
 * Repayments stay per row in `applyBackfillBatch`: each one allocates
 * across the loan schedule in month order.
 */

type ChargeDefinitionRow = {
  code: string
  id: string
  isMonthlyLevy: boolean
  name: string
  purpose?: string | null
}

type LedgerAccountRow = { code: string; id: string }

const backfillLedgerAccountCodes = ["1000", "2000", "3000", "3100", "3200"]

export async function prepareBackfillPostings(input: {
  actorUserId: string
  batchId: string
  memberId: string
  /** False when no month posts a contribution or charge: nothing is read. */
  needsLedger: boolean
  tenantId: string
  tx: PrismaClient
}) {
  const { actorUserId, memberId, tenantId, tx } = input
  const [accounts, member] = input.needsLedger
    ? await Promise.all([
        tx.ledgerAccount.findMany({
          select: { code: true, id: true },
          where: { code: { in: backfillLedgerAccountCodes }, tenantId },
        }) as Promise<LedgerAccountRow[]>,
        tx.member.findFirst({
          select: { id: true },
          where: { id: memberId, tenantId },
        }),
      ])
    : [[] as LedgerAccountRow[], null]
  const accountIdByCode = new Map(accounts.map(({ code, id }) => [code, id]))

  const contributions: Prisma.ContributionCreateManyInput[] = []
  const chargeApplications: Prisma.ChargeApplicationCreateManyInput[] = []
  const transactions: Prisma.LedgerTransactionCreateManyInput[] = []
  const entries: Prisma.LedgerEntryCreateManyInput[] = []
  const shareEntries: Prisma.MemberShareLedgerEntryCreateManyInput[] = []
  const audits: Prisma.AuditLogCreateManyInput[] = []

  let shareChargeWritable: Promise<void> | undefined
  /**
   * `applyCharge` posts a share charge's share entry with sourceType
   * "monthly_share_charge", which runs the live-write guard even in a
   * backfill. Kept so the batch fails exactly where the per-row apply did.
   */
  function assertShareChargeWritable() {
    shareChargeWritable ??= getTenantMigrationWriteAccess(tenantId, tx).then(
      (writeAccess) => {
        if (!writeAccess.canUseLiveFinancialWrites) {
          throw ExpectedQueryError.precondition(
            "Live financial record writes are locked until initial migration is finalized."
          )
        }
      }
    )
    return shareChargeWritable
  }

  /** The two accounts a posting needs, or the error the per-row call threw. */
  function accountPair(debitCode: string, creditCode: string) {
    const debit = accountIdByCode.get(debitCode)
    const credit = accountIdByCode.get(creditCode)
    if (!debit || !credit) {
      throw new QueryInfrastructureError(
        "Ledger accounts not initialized for this cooperative"
      )
    }
    return { credit, debit }
  }

  function addLedgerTransaction(
    transaction: Omit<Prisma.LedgerTransactionCreateManyInput, "id">,
    amount: number,
    accountIds: { credit: string; debit: string }
  ) {
    const id = randomUUID()
    transactions.push({ ...transaction, id })
    entries.push(
      {
        amount,
        direction: "debit",
        ledgerAccountId: accountIds.debit,
        ledgerTransactionId: id,
        tenantId,
      },
      {
        amount,
        direction: "credit",
        ledgerAccountId: accountIds.credit,
        ledgerTransactionId: id,
        tenantId,
      }
    )
  }

  return {
    /** As `recordContribution` (backfill) then `createMemberShareLedgerEntry`. */
    addContribution(month: {
      amount: number
      committedAmount: number
      extraSavingsAmount: number
      monthRowId: string
      periodLabel: string
      postedAt: Date
    }) {
      const accountIds = accountPair("2000", "1000")
      const contributionId = randomUUID()
      contributions.push({
        amount: month.amount,
        channel: "manual",
        committedAmount: month.committedAmount,
        extraSavingsAmount: month.extraSavingsAmount,
        id: contributionId,
        memberId,
        notes: "Posted from backfill apply",
        periodLabel: month.periodLabel,
        postedAt: month.postedAt,
        status: "posted",
        tenantId,
      })
      addLedgerTransaction(
        {
          contributionId,
          memberId,
          narration: `Contribution from member${month.periodLabel ? ` for ${month.periodLabel}` : ""}`,
          postedAt: month.postedAt,
          tenantId,
          transactionType: "contribution",
        },
        month.amount,
        accountIds
      )
      audits.push({
        action: "contribution.recorded",
        actorType: "user",
        actorUserId,
        entityId: contributionId,
        entityType: "Contribution",
        metadata: {
          amount: month.amount,
          channel: "manual",
          committedAmount: month.committedAmount,
          extraSavingsAmount: month.extraSavingsAmount,
          memberId,
        },
        occurredAt: new Date(),
        tenantId,
      })
      shareEntries.push({
        amount: month.amount,
        createdByUserId: actorUserId,
        effectiveDate: month.postedAt,
        memberId,
        notes: `Share posted from backfill ${input.batchId}`,
        sourceId: month.monthRowId,
        sourceType: "backfill",
        tenantId,
      })
    },

    /** As `applyCharge` with sourceType "backfill" and no target. */
    async addCharge(charge: {
      amount: number
      assessedAt: Date
      definition: ChargeDefinitionRow
      notes: string
    }) {
      const { amount, assessedAt, definition } = charge
      if (!Number.isFinite(amount) || amount <= 0) {
        throw ExpectedQueryError.validation(
          "Charge amount must be a positive number."
        )
      }
      if (definition.code === mobileAccessChargeCode) {
        throw ExpectedQueryError.validation(
          "This charge is assessed by mobile billing."
        )
      }
      if (definition.code === platformSeatFeeChargeCode) {
        throw ExpectedQueryError.validation(
          "This charge is assessed by platform billing."
        )
      }
      if (!member) throw ExpectedQueryError.notFound("Member not found")

      const purpose = definition.purpose ?? "general"
      const isShareCharge = purpose === "member_share"
      const accountIds = accountPair(
        "1000",
        isShareCharge ? "3200" : definition.isMonthlyLevy ? "3100" : "3000"
      )
      if (isShareCharge) await assertShareChargeWritable()
      const applicationId = randomUUID()
      chargeApplications.push({
        amount,
        applicabilitySnapshot: {
          amount,
          assessedAt: assessedAt.toISOString(),
          basisAmount: null,
          chargeApplicabilityId: null,
          chargeDefinition: {
            code: definition.code,
            id: definition.id,
            isMonthlyLevy: definition.isMonthlyLevy,
            name: definition.name,
            purpose,
          },
          collectionMode: "deduct_from_savings",
          isRequired: null,
          schemaVersion: 1,
          source: "manual",
          sourceType: "backfill",
          target: null,
          trigger: null,
          version: null,
          workflow: null,
        },
        assessedAt,
        chargeDefinitionId: definition.id,
        collectionMode: "deduct_from_savings",
        id: applicationId,
        memberId,
        notes: charge.notes,
        status: "posted",
        tenantId,
      })
      addLedgerTransaction(
        {
          chargeApplicationId: applicationId,
          memberId,
          narration: `${definition.name} assessed`,
          postedAt: assessedAt,
          tenantId,
          transactionType: definition.isMonthlyLevy ? "levy" : "charge",
        },
        amount,
        accountIds
      )
      if (isShareCharge) {
        shareEntries.push({
          amount,
          createdByUserId: actorUserId,
          effectiveDate: assessedAt,
          memberId,
          notes: charge.notes,
          sourceId: applicationId,
          sourceType: "monthly_share_charge",
          tenantId,
        })
      }
      audits.push({
        action: "charge.applied",
        actorType: "user",
        actorUserId,
        entityId: applicationId,
        entityType: "ChargeApplication",
        metadata: {
          amount,
          chargeDefinitionId: definition.id,
          collectionMode: "deduct_from_savings",
          foodPurchaseApplicationId: null,
          loanId: null,
          loanRequestId: null,
          memberId,
          procurementRequestId: null,
          projectFinancingRequestId: null,
          sourceType: "backfill",
        },
        occurredAt: new Date(),
        tenantId,
      })
    },

    /** Writes everything added, parents before the ledger rows that cite them. */
    async flush() {
      if (contributions.length) {
        await tx.contribution.createMany({ data: contributions })
      }
      if (chargeApplications.length) {
        await tx.chargeApplication.createMany({ data: chargeApplications })
      }
      if (transactions.length) {
        await tx.ledgerTransaction.createMany({ data: transactions })
        await tx.ledgerEntry.createMany({ data: entries })
      }
      if (shareEntries.length) {
        await tx.memberShareLedgerEntry.createMany({ data: shareEntries })
      }
      if (audits.length) {
        await tx.auditLog.createMany({ data: audits })
      }
    },
  }
}
