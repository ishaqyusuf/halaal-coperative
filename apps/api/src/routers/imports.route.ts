import { listImportBatches } from "@halaalvest/db"
import { createTRPCRouter, tenantProcedure } from "../lib.trpc"
import { listImportBatchesSchema } from "../schemas/imports"

export const importsRouter = createTRPCRouter({
  batches: tenantProcedure
    .input(listImportBatchesSchema)
    .query(async ({ ctx, input }) => {
      const pageSize = input?.pageSize ?? 50
      const batches = await listImportBatches(ctx.tenant.current.id, {
        cursor: input?.cursor ?? undefined,
        importType: input?.importType,
        pageSize: pageSize + 1,
        search: input?.q || undefined,
        sort: input?.sort ?? null,
        status: input?.status,
      })
      const data = batches.slice(0, pageSize)

      return {
        data,
        meta: {
          cursor: batches.length > pageSize ? data.at(-1)?.id : undefined,
          total: data.length,
        },
      }
    }),
})
