import {
  getLoanDetail,
  getLoanRequestDetail,
  listLoanRequestRowsPage,
  listLoansPage,
  searchGuarantorOptions,
} from "@halaalvest/db"
import {
  getLoanRequestSchema,
  guarantorOptionsOutputSchema,
  guarantorOptionsSchema,
  getLoanSchema,
  listLoanPortfolioSchema,
  listLoanRequestsSchema,
} from "../schemas/loans"
import { getRequestChargeOptions, getScopedMemberId } from "../lib/member-scope"
import { createTRPCRouter, tenantProcedure } from "../lib.trpc"

export const loansRouter = createTRPCRouter({
  // Charges shown on "Ask for a loan", read only when that form opens. The
  // amount is the charge's own figure (a rate for percentage charges); the
  // form works out the estimate from the amount asked for.
  chargeOptions: tenantProcedure.query(async ({ ctx }) => {
    const quotes = await getRequestChargeOptions(ctx, {
      trigger: "submission",
      workflow: "loan_request",
    })

    return quotes.map((quote) => ({
      amount: quote.effectiveAmount,
      chargeValueType: quote.chargeValueType,
      code: quote.code,
      collectionMode: quote.collectionMode,
      id: quote.chargeDefinitionId,
      name: quote.name,
    }))
  }),

  // Guarantor pickers on "Ask for a loan": names of ready members of this
  // cooperative only (no numbers, contacts or balances), never the asker.
  guarantorOptions: tenantProcedure
    .input(guarantorOptionsSchema)
    .output(guarantorOptionsOutputSchema)
    .query(async ({ ctx, input }) => {
      const scopedMemberId = await getScopedMemberId(ctx)
      if (scopedMemberId === "__missing_member_profile__") return []

      return searchGuarantorOptions({
        excludeMemberId: scopedMemberId,
        ids: input.ids,
        query: input.q,
        tenantId: ctx.tenant.current.id,
      })
    }),

  loan: tenantProcedure.input(getLoanSchema).query(async ({ ctx, input }) => {
    const scopedMemberId = await getScopedMemberId(ctx)
    const loan = await getLoanDetail({
      id: input.loanId,
      memberId: scopedMemberId,
      tenantId: ctx.tenant.current.id,
    })

    return loan
  }),

  portfolio: tenantProcedure
    .input(listLoanPortfolioSchema)
    .query(async ({ ctx, input }) => {
      const scopedMemberId = await getScopedMemberId(ctx)
      const result = await listLoansPage(ctx.tenant.current.id, {
        cursor: input?.cursor,
        memberId: scopedMemberId ?? input?.memberId,
        pageSize: input?.pageSize,
        q: input?.q || undefined,
        sort: input?.sort,
        status: input?.status || undefined,
      })

      return {
        data: result.data,
        meta: result.meta,
      }
    }),

  request: tenantProcedure
    .input(getLoanRequestSchema)
    .query(async ({ ctx, input }) => {
      const scopedMemberId = await getScopedMemberId(ctx)
      const request = await getLoanRequestDetail({
        id: input.loanRequestId,
        memberId: scopedMemberId,
        tenantId: ctx.tenant.current.id,
      })

      return request
    }),

  requests: tenantProcedure
    .input(listLoanRequestsSchema)
    .query(async ({ ctx, input }) => {
      const scopedMemberId = await getScopedMemberId(ctx)
      const result = await listLoanRequestRowsPage(ctx.tenant.current.id, {
        cursor: input?.cursor,
        memberId: scopedMemberId ?? input?.memberId,
        pageSize: input?.pageSize,
        q: input?.q || undefined,
        sort: input?.sort,
        status: input?.status || undefined,
      })

      return {
        data: result.data,
        meta: result.meta,
      }
    }),
})
