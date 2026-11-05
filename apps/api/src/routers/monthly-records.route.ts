import { getMonthlyRecordDetail, pageMonthlyRecordRows } from "@halaalvest/db"
import { createTRPCRouter, tenantProcedure } from "../lib.trpc"
import { listMonthlyRecordRowsSchema } from "../schemas/monthly-records"

export const monthlyRecordsRouter = createTRPCRouter({
  rows: tenantProcedure
    .input(listMonthlyRecordRowsSchema)
    .query(async ({ ctx, input }) => {
      if (!input?.monthlyRecordId) {
        return {
          data: [],
          meta: {
            cursor: undefined,
            total: 0,
          },
        }
      }

      const record = await getMonthlyRecordDetail(
        ctx.tenant.current.id,
        input.monthlyRecordId,
      )

      return pageMonthlyRecordRows(record?.rows ?? [], input)
    }),
})
