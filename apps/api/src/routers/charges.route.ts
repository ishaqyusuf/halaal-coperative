import { z } from "zod"
import { createTRPCRouter, minRoleProcedure, staffProcedure } from "../lib.trpc"
import {
  chargeApplicabilityTriggerKeys,
  chargeCollectionModeKeys,
  chargeWorkflowKeys,
  createChargeDefinitionVersion,
  listChargeActivityPage,
  listChargeDefinitions,
  listChargeDefinitionVersions,
  createChargeDefinition,
  updateChargeDefinition,
} from "@halaalvest/db"
import {
  listChargeActivitySchema,
  listChargeLibrarySchema,
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

type ChargeAppliesTo =
  | "food_purchase"
  | "loan"
  | "loan_request"
  | "monthly_collection"
  | "procurement"
  | "project_financing"

type ChargeLibraryRow = {
  amount: number
  appliesTo: ChargeAppliesTo[]
  chargeFrequency: ChargeFrequency
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

const chargeAppliesToByWorkflow: Record<string, ChargeAppliesTo> = {
  commitment_collection: "monthly_collection",
  food_purchase_application: "food_purchase",
  loan: "loan",
  loan_request: "loan_request",
  procurement_request: "procurement",
  project_financing_request: "project_financing",
}

// Which workflows post this charge on their own, in one stable order.
function toChargeAppliesTo(
  applicability: Array<{ isActive?: boolean; workflow: string }>
): ChargeAppliesTo[] {
  const found = new Set(
    applicability
      .filter((row) => row.isActive !== false)
      .map((row) => chargeAppliesToByWorkflow[row.workflow])
      .filter((value): value is ChargeAppliesTo => Boolean(value))
  )

  return Object.values(chargeAppliesToByWorkflow).filter((value) =>
    found.has(value)
  )
}

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
      appliesTo: toChargeAppliesTo(charge.applicability ?? []),
      chargeFrequency: charge.chargeFrequency ?? "recurring_monthly",
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

function filterChargeLibraryRows(
  rows: ReturnType<typeof mapChargeLibraryRows>,
  input: NonNullable<z.infer<typeof listChargeLibrarySchema>>
) {
  const query = (input.q ?? "").trim().toLowerCase()

  return rows.filter((row) => {
    if (
      input.status &&
      (input.status === "active" ? !row.isActive : row.isActive)
    ) {
      return false
    }
    if (input.frequency && row.chargeFrequency !== input.frequency) return false
    if (input.valueType && row.chargeValueType !== input.valueType) return false
    if (!query) return true

    return [
      row.name,
      row.code,
      row.kind,
      row.chargeFrequency,
      row.chargeValueType,
      row.isActive ? "active" : "inactive",
    ]
      .join(" ")
      .toLowerCase()
      .includes(query)
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

export const chargesRouter = createTRPCRouter({
  chargeLibrary: staffProcedure
    .input(listChargeLibrarySchema)
    .query(async ({ ctx, input }) => {
      const rows = sortChargeLibraryRows(
        filterChargeLibraryRows(
          mapChargeLibraryRows(
            await listChargeDefinitions(ctx.tenant.current.id)
          ),
          input ?? {}
        ),
        input?.sort ?? null
      )

      return {
        data: rows,
        meta: {
          total: rows.length,
        },
      }
    }),

  activity: staffProcedure
    .input(listChargeActivitySchema)
    .query(async ({ ctx, input }) => {
      return listChargeActivityPage({
        cursor: input?.cursor,
        pageSize: input?.pageSize,
        q: input?.q,
        tenantId: ctx.tenant.current.id,
      })
    }),

  listDefinitions: staffProcedure.query(async ({ ctx }) => {
    return listChargeDefinitions(ctx.tenant.current.id)
  }),

  createDefinition: minRoleProcedure("tenant_admin")
    .input(
      z.object({
        name: z.string().min(1),
        code: z.string().min(1).optional(),
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

  listVersions: staffProcedure
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
