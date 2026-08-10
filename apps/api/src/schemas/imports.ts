import { z } from "zod"

const importKindSchema = z.enum([
  "members",
  "deduction_sources",
  "loan_products",
  "contributions",
  "charges",
  "loan_migrations",
  "repayment_migrations",
])

const importSortFieldSchema = z.enum([
  "createdAt",
  "createdBy",
  "importType",
  "reviewCount",
  "status",
  "totalRows",
])

const importBatchStatusSchema = z.enum(["draft", "applied", "failed"])

export const getImportBatchSchema = z.object({
  batchId: z.string().min(1),
})

export const listImportBatchesSchema = z
  .object({
    cursor: z.string().nullable().optional(),
    importType: importKindSchema.optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    q: z.string().nullable().optional(),
    sort: z
      .tuple([importSortFieldSchema, z.enum(["asc", "desc"])])
      .nullable()
      .optional(),
    status: importBatchStatusSchema.nullable().optional(),
  })
  .optional()
