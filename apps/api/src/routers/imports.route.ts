import {
  getImportBatch,
  getImportReferenceData,
  listImportBatches,
} from "@halaalvest/db"
import { createTRPCRouter, minRoleProcedure, staffProcedure } from "../lib.trpc"
import {
  getImportBatchSchema,
  listImportBatchesSchema,
} from "../schemas/imports"

export const importsRouter = createTRPCRouter({
  // Batches hold members' rows and amounts: staff only.
  batch: staffProcedure.input(getImportBatchSchema).query(({ ctx, input }) =>
    getImportBatch({
      batchId: input.batchId,
      tenantId: ctx.tenant.current.id,
    })
  ),
  batches: staffProcedure
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
  // Existing member numbers, collection sources, loan products and charge
  // codes for in-sheet duplicate checks. Fetched when an import sheet opens,
  // not on page load.
  referenceData: minRoleProcedure("operations_officer").query(({ ctx }) =>
    getImportReferenceData(ctx.tenant.current.id)
  ),
})
