import {
  getRepayment,
  getRepaymentScheduleItem,
  getRepaymentSummary,
  listRepaymentHistoryPage,
  listRepaymentSchedulePage,
} from "@halaalvest/db"
import {
  getRepaymentScheduleItemSchema,
  getRepaymentSchema,
  listRepaymentHistorySchema,
  listRepaymentScheduleSchema,
  repaymentSummarySchema,
} from "../schemas/repayments"
import { createTRPCRouter, minRoleProcedure } from "../lib.trpc"

/** Repayment servicing is a finance workspace; member access remains denied. */
const repaymentProcedure = minRoleProcedure("finance_officer")

export const repaymentsRouter = createTRPCRouter({
  history: repaymentProcedure
    .input(listRepaymentHistorySchema)
    .query(({ ctx, input }) =>
      listRepaymentHistoryPage({
        cursor: input?.cursor,
        fromDate: input?.fromDate,
        memberId: input?.memberId,
        pageSize: input?.pageSize,
        q: input?.q ?? undefined,
        sort: input?.sort,
        status: input?.status,
        tenantId: ctx.tenant.current.id,
        toDate: input?.toDate,
      })
    ),

  repayment: repaymentProcedure
    .input(getRepaymentSchema)
    .query(({ ctx, input }) =>
      getRepayment({
        repaymentId: input.repaymentId,
        tenantId: ctx.tenant.current.id,
      })
    ),

  schedule: repaymentProcedure
    .input(listRepaymentScheduleSchema)
    .query(({ ctx, input }) =>
      listRepaymentSchedulePage({
        assignedToUserId: input?.assignedToUserId,
        collectionsOnly: input?.collectionsOnly,
        cursor: input?.cursor,
        fromDate: input?.fromDate,
        memberId: input?.memberId,
        pageSize: input?.pageSize,
        q: input?.q ?? undefined,
        resolutionStatus: input?.resolutionStatus,
        sort: input?.sort,
        stage: input?.stage,
        status: input?.status,
        tenantId: ctx.tenant.current.id,
        toDate: input?.toDate,
      })
    ),

  scheduleItem: repaymentProcedure
    .input(getRepaymentScheduleItemSchema)
    .query(({ ctx, input }) =>
      getRepaymentScheduleItem({
        repaymentScheduleItemId: input.repaymentScheduleItemId,
        tenantId: ctx.tenant.current.id,
      })
    ),

  summary: repaymentProcedure
    .input(repaymentSummarySchema)
    .query(({ ctx, input }) =>
      getRepaymentSummary({
        assignedToUserId: input?.assignedToUserId,
        collectionsOnly: input?.collectionsOnly,
        fromDate: input?.fromDate,
        memberId: input?.memberId,
        q: input?.q ?? undefined,
        resolutionStatus: input?.resolutionStatus,
        stage: input?.stage,
        status: input?.status,
        tenantId: ctx.tenant.current.id,
        toDate: input?.toDate,
      })
    ),
})
