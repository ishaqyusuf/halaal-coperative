import { z } from "zod"

const chargeLibrarySortFieldSchema = z.enum([
  "amount",
  "currentEffectiveFrom",
  "isActive",
  "kind",
  "name",
])

export const listChargeLibrarySchema = z
  .object({
    cursor: z.string().nullable().optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    sort: z
      .tuple([chargeLibrarySortFieldSchema, z.enum(["asc", "desc"])])
      .nullable()
      .optional(),
  })
  .optional()

const financeChargeSortFieldSchema = z.enum([
  "chargeFrequency",
  "chargeValueType",
  "currentAmount",
  "isActive",
  "name",
  "versionCount",
])

export const listFinanceChargesSchema = z
  .object({
    cursor: z.string().nullable().optional(),
    frequency: z.string().nullable().optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    q: z.string().nullable().optional(),
    sort: z
      .tuple([financeChargeSortFieldSchema, z.enum(["asc", "desc"])])
      .nullable()
      .optional(),
    status: z.string().nullable().optional(),
    valueType: z.string().nullable().optional(),
  })
  .optional()

const financeShareSortFieldSchema = z.enum([
  "amount",
  "effectiveFrom",
  "isCurrent",
  "notes",
  "valueType",
])

export const listFinanceSharesSchema = z
  .object({
    cursor: z.string().nullable().optional(),
    effectiveFrom: z.string().nullable().optional(),
    effectiveTo: z.string().nullable().optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    q: z.string().nullable().optional(),
    sort: z
      .tuple([financeShareSortFieldSchema, z.enum(["asc", "desc"])])
      .nullable()
      .optional(),
    status: z.string().nullable().optional(),
    valueType: z.string().nullable().optional(),
  })
  .optional()
