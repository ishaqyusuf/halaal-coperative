import {
  getLoanDetail,
  getLoanRequestDetail,
  getMemberByUserId,
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
import { createTRPCRouter, tenantProcedure } from "../lib.trpc"

type LoanRouterContext = {
  auth: {
    activeMembership: { role: string }
    session: { user: { id: string } }
  }
  tenant: { current: { id: string } }
}

async function getScopedMemberId(ctx: LoanRouterContext) {
  if (ctx.auth.activeMembership.role !== "member") {
    return undefined
  }

  const member = await getMemberByUserId({
    tenantId: ctx.tenant.current.id,
    userId: ctx.auth.session.user.id,
  })

  return member?.id ?? "__missing_member_profile__"
}

export const loansRouter = createTRPCRouter({
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
