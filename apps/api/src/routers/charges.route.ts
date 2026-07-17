import { z } from "zod"
import {
  createTRPCRouter,
  tenantProcedure,
  minRoleProcedure,
} from "../lib.trpc"
import {
  chargeApplicabilityTriggerKeys,
  chargeCollectionModeKeys,
  chargeWorkflowKeys,
  createChargeDefinitionVersion,
  getTenantFinanceSetup,
  listChargeDefinitions,
  listChargeDefinitionVersions,
  createChargeDefinition,
  updateChargeDefinition,
} from "@halaalvest/db"
import {
  listChargeLibrarySchema,
  listFinanceChargesSchema,
  listFinanceSharesSchema,
} from "../schemas/charges"

const chargeApplicabilityInput = z.object({
  collectionMode: z.enum(chargeCollectionModeKeys).optional(),
  isActive: z.boolean().optional(),
  isRequired: z.boolean().optional(),
  trigger: z.enum(chargeApplicabilityTriggerKeys),
  workflow: z.enum(chargeWorkflowKeys),
})

type ChargeLibrarySortField =
  | "amount"
  | "currentEffectiveFrom"
  | "isActive"
  | "kind"
  | "name"

type FinanceChargeSortField =
  | "chargeFrequency"
  | "chargeValueType"
  | "currentAmount"
  | "isActive"
  | "name"
  | "versionCount"

type FinanceShareSortField =
  | "amount"
  | "effectiveFrom"
  | "isCurrent"
  | "notes"
  | "valueType"

type ChargeValueType = "fixed_amount" | "percentage"
type ChargeVersionStatus = "current" | "historical" | "scheduled"
type ChargeFrequency =
  | "manual"
  | "one_time"
  | "per_contribution"
  | "recurring_monthly"
type ChargePurpose =
  | "general"
  | "loan_fee"
  | "member_share"
  | "membership_fee"
  | "penalty"

type ChargeLibraryVersionRow = {
  amount: number
  effectiveFrom: string
  id: string
  notes: string | null
  status: ChargeVersionStatus
}

type ChargeLibraryRow = {
  amount: number
  chargeValueType: ChargeValueType
  code: string
  currentEffectiveFrom: string | null
  id: string
  isActive: boolean
  isMonthlyLevy: boolean
  kind: string
  name: string
  versions: ChargeLibraryVersionRow[]
}

type FinanceChargeVersionRow = {
  amount: number
  chargeValueType: ChargeValueType
  effectiveFrom: string
  id: string
  notes: string | null
  status: ChargeVersionStatus
}

type FinanceChargeRow = {
  appliesToLoanRequests: boolean
  appliesToLoans: boolean
  appliesToMembers: boolean
  chargeFrequency: ChargeFrequency
  chargeValueType: ChargeValueType
  code: string
  currentVersion: FinanceChargeVersionRow | null
  id: string
  isActive: boolean
  kind: string
  name: string
  purpose: ChargePurpose
  versions: FinanceChargeVersionRow[]
}

type FinanceShareRow = {
  amount: number
  basis: "after_charge_deductions"
  effectiveFrom: string
  id: string
  isCurrent: boolean
  notes?: string | null
  valueType: ChargeValueType
}

type ListFinanceChargesInput = NonNullable<
  z.infer<typeof listFinanceChargesSchema>
>
type ListFinanceSharesInput = NonNullable<
  z.infer<typeof listFinanceSharesSchema>
>

function mapChargeLibraryRows(
  charges: Awaited<ReturnType<typeof listChargeDefinitions>>
): ChargeLibraryRow[] {
  const today = new Date()

  return charges.map((charge: any): ChargeLibraryRow => {
    const sortedVersions = [...(charge.versions ?? [])].sort(
      (left, right) =>
        new Date(right.effectiveFrom).getTime() -
        new Date(left.effectiveFrom).getTime()
    )
    const currentVersion =
      sortedVersions.find(
        (version) =>
          new Date(version.effectiveFrom).getTime() <= today.getTime()
      ) ?? null

    return {
      amount: currentVersion
        ? Number(currentVersion.amount)
        : Number(charge.amount),
      chargeValueType:
        charge.chargeValueType ??
        (charge.kind === "percentage" ? "percentage" : "fixed_amount"),
      code: charge.code,
      currentEffectiveFrom: currentVersion
        ? currentVersion.effectiveFrom.toISOString().slice(0, 10)
        : null,
      id: charge.id,
      isActive: charge.isActive,
      isMonthlyLevy: charge.isMonthlyLevy,
      kind: charge.kind,
      name: charge.name,
      versions: sortedVersions.map(
        (version: any): ChargeLibraryVersionRow => ({
          amount: Number(version.amount),
          effectiveFrom: version.effectiveFrom.toISOString().slice(0, 10),
          id: version.id,
          notes: version.notes ?? null,
          status:
            currentVersion?.id === version.id
              ? "current"
              : new Date(version.effectiveFrom).getTime() > today.getTime()
                ? "scheduled"
                : "historical",
        })
      ),
    }
  })
}

function getChargeLibrarySortValue(
  row: ReturnType<typeof mapChargeLibraryRows>[number],
  field: ChargeLibrarySortField
) {
  if (field === "amount") return Number(row.amount)
  if (field === "currentEffectiveFrom") return row.currentEffectiveFrom ?? ""
  if (field === "isActive") return row.isActive ? 1 : 0

  return row[field]
}

function sortChargeLibraryRows(
  rows: ReturnType<typeof mapChargeLibraryRows>,
  sort?: [ChargeLibrarySortField, "asc" | "desc"] | null
) {
  if (!sort) return rows

  const [field, direction] = sort
  const factor = direction === "asc" ? 1 : -1

  return [...rows].sort((left, right) => {
    const leftValue = getChargeLibrarySortValue(left, field)
    const rightValue = getChargeLibrarySortValue(right, field)

    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return (leftValue - rightValue) * factor
    }

    return String(leftValue).localeCompare(String(rightValue)) * factor
  })
}

function mapFinanceChargeRows(
  rows: Awaited<ReturnType<typeof getTenantFinanceSetup>>["chargeDefinitions"]
): FinanceChargeRow[] {
  const today = new Date()

  return rows.map((charge: any): FinanceChargeRow => {
    const currentVersion =
      [...(charge.versions ?? [])]
        .reverse()
        .find(
          (version) =>
            new Date(version.effectiveFrom).getTime() <= today.getTime()
        ) ?? null
    const versions: FinanceChargeVersionRow[] = (charge.versions ?? []).map(
      (version: any): FinanceChargeVersionRow => ({
        amount: Number(version.amount),
        chargeValueType:
          version.chargeValueType ??
          (version.kind === "percentage" ? "percentage" : "fixed_amount"),
        effectiveFrom: version.effectiveFrom.toISOString().slice(0, 10),
        id: version.id,
        notes: version.notes ?? null,
        status:
          currentVersion?.id === version.id
            ? "current"
            : new Date(version.effectiveFrom).getTime() > today.getTime()
              ? "scheduled"
              : "historical",
      })
    )

    return {
      appliesToLoanRequests: charge.appliesToLoanRequests ?? false,
      appliesToLoans: charge.appliesToLoans ?? false,
      appliesToMembers: charge.appliesToMembers ?? true,
      chargeFrequency: charge.chargeFrequency ?? "recurring_monthly",
      chargeValueType:
        charge.chargeValueType ??
        (charge.kind === "percentage" ? "percentage" : "fixed_amount"),
      code: charge.code,
      currentVersion:
        versions.find((version) => version.status === "current") ??
        versions.at(-1) ??
        null,
      id: charge.id,
      isActive: charge.isActive,
      kind: charge.kind,
      name: charge.name,
      purpose: charge.purpose ?? "general",
      versions,
    }
  })
}

function filterFinanceChargeRows(
  rows: ReturnType<typeof mapFinanceChargeRows>,
  input: ListFinanceChargesInput
) {
  const query = (input.q ?? "").toLowerCase()

  return rows.filter((row) => {
    const matchesStatus =
      !input.status ||
      (input.status === "active" ? row.isActive : !row.isActive)
    const matchesFrequency =
      !input.frequency || row.chargeFrequency === input.frequency
    const matchesValueType =
      !input.valueType || row.chargeValueType === input.valueType

    if (!matchesStatus || !matchesFrequency || !matchesValueType) {
      return false
    }

    if (!query) return true

    const searchable = [
      row.name,
      row.code,
      row.kind,
      row.chargeFrequency,
      row.chargeValueType,
      row.isActive ? "active" : "inactive",
      row.currentVersion?.amount.toString() ?? "",
      row.currentVersion?.notes ?? "",
    ]
      .join(" ")
      .toLowerCase()

    return searchable.includes(query)
  })
}

function getFinanceChargeSortValue(
  row: ReturnType<typeof mapFinanceChargeRows>[number],
  field: FinanceChargeSortField
) {
  if (field === "currentAmount") return row.currentVersion?.amount ?? 0
  if (field === "isActive") return row.isActive ? 1 : 0
  if (field === "versionCount") return row.versions.length

  return row[field] ?? ""
}

function sortFinanceChargeRows(
  rows: ReturnType<typeof mapFinanceChargeRows>,
  sort?: [FinanceChargeSortField, "asc" | "desc"] | null
) {
  if (!sort) return rows

  const [field, direction] = sort
  const factor = direction === "asc" ? 1 : -1

  return [...rows].sort((left, right) => {
    const leftValue = getFinanceChargeSortValue(left, field)
    const rightValue = getFinanceChargeSortValue(right, field)

    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return (leftValue - rightValue) * factor
    }

    return String(leftValue).localeCompare(String(rightValue)) * factor
  })
}

function mapFinanceShareRows(
  rows: Awaited<
    ReturnType<typeof getTenantFinanceSetup>
  >["shareStructureVersions"]
): FinanceShareRow[] {
  return rows.map((version: any, index: number): FinanceShareRow => ({
    amount: Number(version.amount),
    basis: version.basis ?? "after_charge_deductions",
    effectiveFrom: version.effectiveFrom.toISOString().slice(0, 10),
    id: version.id,
    isCurrent: index === rows.length - 1,
    notes: version.notes ?? null,
    valueType: version.valueType ?? "fixed_amount",
  }))
}

function filterFinanceShareRows(
  rows: ReturnType<typeof mapFinanceShareRows>,
  input: ListFinanceSharesInput
) {
  const query = (input.q ?? "").toLowerCase()

  return rows.filter((row) => {
    const matchesStatus =
      !input.status ||
      (input.status === "current" ? row.isCurrent : !row.isCurrent)
    const matchesValueType =
      !input.valueType || row.valueType === input.valueType
    const matchesEffectiveFrom =
      !input.effectiveFrom || row.effectiveFrom >= input.effectiveFrom
    const matchesEffectiveTo =
      !input.effectiveTo || row.effectiveFrom <= input.effectiveTo

    if (
      !matchesStatus ||
      !matchesValueType ||
      !matchesEffectiveFrom ||
      !matchesEffectiveTo
    ) {
      return false
    }

    if (!query) return true

    const searchable = [
      row.effectiveFrom,
      row.valueType === "percentage"
        ? "percentage after charges"
        : "fixed amount",
      row.amount.toString(),
      row.notes ?? "",
      row.isCurrent ? "current" : "historical",
    ]
      .join(" ")
      .toLowerCase()

    return searchable.includes(query)
  })
}

function getFinanceShareSortValue(
  row: ReturnType<typeof mapFinanceShareRows>[number],
  field: FinanceShareSortField
) {
  if (field === "isCurrent") return row.isCurrent ? 1 : 0

  return row[field] ?? ""
}

function sortFinanceShareRows(
  rows: ReturnType<typeof mapFinanceShareRows>,
  sort?: [FinanceShareSortField, "asc" | "desc"] | null
) {
  if (!sort) return rows

  const [field, direction] = sort
  const factor = direction === "asc" ? 1 : -1

  return [...rows].sort((left, right) => {
    const leftValue = getFinanceShareSortValue(left, field)
    const rightValue = getFinanceShareSortValue(right, field)

    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return (leftValue - rightValue) * factor
    }

    return String(leftValue).localeCompare(String(rightValue)) * factor
  })
}

function paginateRows<T extends { id: string }>(
  rows: T[],
  input?: { cursor?: string | null; pageSize?: number } | null
) {
  const pageSize = input?.pageSize ?? 50
  const startIndex = input?.cursor
    ? rows.findIndex((row) => row.id === input.cursor) + 1
    : 0
  const safeStartIndex = startIndex > 0 ? startIndex : 0
  const pageRows = rows.slice(safeStartIndex, safeStartIndex + pageSize + 1)
  const data = pageRows.slice(0, pageSize)

  return {
    data,
    meta: {
      cursor: pageRows.length > pageSize ? data.at(-1)?.id : undefined,
      total: rows.length,
    },
  }
}

export const chargesRouter = createTRPCRouter({
  chargeLibrary: tenantProcedure
    .input(listChargeLibrarySchema)
    .query(async ({ ctx, input }) => {
      const pageSize = input?.pageSize ?? 50
      const rows = sortChargeLibraryRows(
        mapChargeLibraryRows(
          await listChargeDefinitions(ctx.tenant.current.id)
        ),
        input?.sort ?? null
      )
      const startIndex = input?.cursor
        ? rows.findIndex((row) => row.id === input.cursor) + 1
        : 0
      const data = rows.slice(startIndex, startIndex + pageSize)
      const next = rows[startIndex + pageSize]

      return {
        data,
        meta: {
          cursor: next?.id,
          total: rows.length,
        },
      }
    }),

  financeCharges: tenantProcedure
    .input(listFinanceChargesSchema)
    .query(async ({ ctx, input }) => {
      const setup = await getTenantFinanceSetup(ctx.tenant.current.id)
      const rows = sortFinanceChargeRows(
        filterFinanceChargeRows(
          mapFinanceChargeRows(setup.chargeDefinitions),
          input ?? {}
        ),
        input?.sort ?? null
      )

      return paginateRows(rows, input)
    }),

  financeShares: tenantProcedure
    .input(listFinanceSharesSchema)
    .query(async ({ ctx, input }) => {
      const setup = await getTenantFinanceSetup(ctx.tenant.current.id)
      const rows = sortFinanceShareRows(
        filterFinanceShareRows(
          mapFinanceShareRows(setup.shareStructureVersions),
          input ?? {}
        ),
        input?.sort ?? null
      )

      return paginateRows(rows, input)
    }),

  listDefinitions: tenantProcedure.query(async ({ ctx }) => {
    return listChargeDefinitions(ctx.tenant.current.id)
  }),

  createDefinition: minRoleProcedure("tenant_admin")
    .input(
      z.object({
        name: z.string().min(1),
        code: z.string().min(1),
        kind: z.enum(["fixed", "percentage"]),
        amount: z.number().positive(),
        effectiveFrom: z.coerce.date().optional(),
        isMonthlyLevy: z.boolean().optional(),
        appliesToMembers: z.boolean().optional(),
        appliesToLoanRequests: z.boolean().optional(),
        appliesToLoans: z.boolean().optional(),
        applicability: z.array(chargeApplicabilityInput).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createChargeDefinition({
        ...input,
        effectiveFrom: input.effectiveFrom ?? new Date(),
        tenantId: ctx.tenant.current.id,
      })
    }),

  listVersions: tenantProcedure
    .input(
      z.object({
        chargeDefinitionId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      return listChargeDefinitionVersions(
        ctx.tenant.current.id,
        input.chargeDefinitionId
      )
    }),

  createVersion: minRoleProcedure("tenant_admin")
    .input(
      z.object({
        chargeDefinitionId: z.string().uuid(),
        effectiveFrom: z.coerce.date(),
        amount: z.number().positive(),
        kind: z.enum(["fixed", "percentage"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createChargeDefinitionVersion({
        ...input,
        createdByUserId: ctx.auth.session.user.id,
        tenantId: ctx.tenant.current.id,
      })
    }),

  updateDefinition: minRoleProcedure("tenant_admin")
    .input(
      z.object({
        chargeDefinitionId: z.string().uuid(),
        name: z.string().min(1).optional(),
        kind: z.enum(["fixed", "percentage"]).optional(),
        amount: z.number().positive().optional(),
        effectiveFrom: z.coerce.date().optional(),
        notes: z.string().optional(),
        isActive: z.boolean().optional(),
        appliesToMembers: z.boolean().optional(),
        appliesToLoanRequests: z.boolean().optional(),
        appliesToLoans: z.boolean().optional(),
        applicability: z.array(chargeApplicabilityInput).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { chargeDefinitionId, ...data } = input
      return updateChargeDefinition(ctx.tenant.current.id, chargeDefinitionId, {
        ...data,
        createdByUserId: ctx.auth.session.user.id,
      })
    }),
})
