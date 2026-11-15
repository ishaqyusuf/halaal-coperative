import type {
  DeductionSourceType,
  KycStatus,
  LoanStatus,
  MemberStatus,
  MemberType,
  Prisma,
  PrismaClient,
} from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError, QueryInfrastructureError } from "../query-error"
import { createAuditLogEntry } from "./audit"
import {
  postImportedCharges,
  postImportedContributions,
  postImportedLoanMigrations,
  postImportedMembers,
  resolveImportedRepaymentLoans,
} from "./import-posting"
import { getLedgerAccountByCode } from "./ledger"
import { postRepaymentInTransaction } from "./loans"

type ImportResult = {
  processed: number
}

/**
 * Runs `fn` in a transaction, or straight on the client when it already is
 * one (an interactive transaction client has no `$transaction`).
 */
function runAtomic<T>(
  prisma: PrismaClient,
  fn: (db: PrismaClient) => Promise<T>
): Promise<T> {
  return typeof (prisma as { $transaction?: unknown }).$transaction ===
    "function"
    ? prisma.$transaction((tx) => fn(tx as unknown as PrismaClient), {
        maxWait: 10_000,
        timeout: 120_000,
      })
    : fn(prisma)
}

export type ImportKind =
  | "members"
  | "deduction_sources"
  | "loan_products"
  | "contributions"
  | "charges"
  | "loan_migrations"
  | "repayment_migrations"

type ImportPayloadRow =
  | Parameters<typeof importMembers>[0]["rows"][number]
  | Parameters<typeof importDeductionSources>[0]["rows"][number]
  | Parameters<typeof importLoanProducts>[0]["rows"][number]
  | Parameters<typeof importContributions>[0]["rows"][number]
  | Parameters<typeof importCharges>[0]["rows"][number]
  | Parameters<typeof importLoanMigrations>[0]["rows"][number]
  | Parameters<typeof importRepaymentMigrations>[0]["rows"][number]

function castImportRows(kind: ImportKind, rows: Prisma.JsonValue[]) {
  switch (kind) {
    case "members":
      return rows as unknown as Parameters<typeof importMembers>[0]["rows"]
    case "deduction_sources":
      return rows as unknown as Parameters<
        typeof importDeductionSources
      >[0]["rows"]
    case "loan_products":
      return rows as unknown as Parameters<typeof importLoanProducts>[0]["rows"]
    case "contributions":
      return rows as unknown as Parameters<
        typeof importContributions
      >[0]["rows"]
    case "charges":
      return rows as unknown as Parameters<typeof importCharges>[0]["rows"]
    case "loan_migrations":
      return rows as unknown as Parameters<
        typeof importLoanMigrations
      >[0]["rows"]
    case "repayment_migrations":
      return rows as unknown as Parameters<
        typeof importRepaymentMigrations
      >[0]["rows"]
    default:
      throw new QueryInfrastructureError("Unsupported import kind")
  }
}

async function assertMemberRecordImportsOpen(
  tenantId: string,
  prisma: PrismaClient
) {
  const tenant =
    typeof (prisma as any).tenant?.findUnique === "function"
      ? await (prisma as any).tenant.findUnique({
          select: {
            initialMigrationStatus: true,
            migrationFinalizedAt: true,
          },
          where: { id: tenantId },
        })
      : null

  if (
    tenant?.migrationFinalizedAt ||
    tenant?.initialMigrationStatus === "finalized" ||
    tenant?.initialMigrationStatus === "live_operations"
  ) {
    throw ExpectedQueryError.precondition(
      "Member record imports are locked because initial migration is finalized. Use live correction workflows after go-live."
    )
  }

  const appliedMonths =
    typeof (prisma as any).appliedBackfillMonth?.findMany === "function"
      ? await (prisma as any).appliedBackfillMonth.findMany({
          where: { tenantId },
          select: { id: true },
          take: 1,
        })
      : []
  const appliedBatches =
    typeof (prisma as any).backfillBatch?.findMany === "function"
      ? await (prisma as any).backfillBatch.findMany({
          where: {
            tenantId,
            status: "applied",
          },
          select: { id: true },
          take: 1,
        })
      : []

  if (appliedMonths.length || appliedBatches.length) {
    throw ExpectedQueryError.precondition(
      "Member record imports are locked because member ledger backfill has already started. Finish migration or use live correction workflows after go-live."
    )
  }
}

async function applyImportRows(
  input: {
    actorUserId: string
    batchId?: string
    kind: ImportKind
    rows: Prisma.JsonValue[]
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  switch (input.kind) {
    case "members":
      return importMembers(
        {
          actorUserId: input.actorUserId,
          rows: castImportRows("members", input.rows) as Parameters<
            typeof importMembers
          >[0]["rows"],
          tenantId: input.tenantId,
        },
        prismaOverride
      )
    case "deduction_sources":
      return importDeductionSources(
        {
          actorUserId: input.actorUserId,
          rows: castImportRows("deduction_sources", input.rows) as Parameters<
            typeof importDeductionSources
          >[0]["rows"],
          tenantId: input.tenantId,
        },
        prismaOverride
      )
    case "loan_products":
      return importLoanProducts(
        {
          actorUserId: input.actorUserId,
          rows: castImportRows("loan_products", input.rows) as Parameters<
            typeof importLoanProducts
          >[0]["rows"],
          tenantId: input.tenantId,
        },
        prismaOverride
      )
    case "contributions":
      return importContributions(
        {
          actorUserId: input.actorUserId,
          batchId: input.batchId,
          rows: castImportRows("contributions", input.rows) as Parameters<
            typeof importContributions
          >[0]["rows"],
          tenantId: input.tenantId,
        },
        prismaOverride
      )
    case "charges":
      return importCharges(
        {
          actorUserId: input.actorUserId,
          batchId: input.batchId,
          rows: castImportRows("charges", input.rows) as Parameters<
            typeof importCharges
          >[0]["rows"],
          tenantId: input.tenantId,
        },
        prismaOverride
      )
    case "loan_migrations":
      return importLoanMigrations(
        {
          actorUserId: input.actorUserId,
          rows: castImportRows("loan_migrations", input.rows) as Parameters<
            typeof importLoanMigrations
          >[0]["rows"],
          tenantId: input.tenantId,
        },
        prismaOverride
      )
    case "repayment_migrations":
      return importRepaymentMigrations(
        {
          actorUserId: input.actorUserId,
          rows: castImportRows(
            "repayment_migrations",
            input.rows
          ) as Parameters<typeof importRepaymentMigrations>[0]["rows"],
          tenantId: input.tenantId,
        },
        prismaOverride
      )
  }
}

/** Statuses that block adding the same file again. */
const settledImportStatuses = ["applied", "applying", "partial"]

export async function createImportBatch(
  input: {
    actorUserId: string
    duplicateRowCount: number
    existingMatchCount: number
    importType: ImportKind
    rows: Array<{
      duplicateInFile: boolean
      existingMatch: boolean
      payload: Record<string, unknown>
      primaryValue?: string | null
      rowIndex: number
    }>
    /**
     * The file as the server read it back (canonical CSV), so the same file
     * uploaded again, as CSV or as a workbook, matches an earlier batch.
     */
    sourceCsv: string
    tenantId: string
    validRows: number
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  await assertMemberRecordImportsOpen(input.tenantId, prisma)

  return prisma.$transaction(
    async (tx) => {
      // One import of a kind at a time per cooperative, so two uploads of the
      // same file cannot both pass the check below.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`import:${input.tenantId}:${input.importType}`}))`

      const sameFile = await tx.importBatch.findFirst({
        orderBy: { createdAt: "desc" },
        select: { appliedAt: true, id: true, status: true },
        where: {
          importType: input.importType,
          sourceCsv: input.sourceCsv,
          status: { in: [...settledImportStatuses, "draft"] },
          tenantId: input.tenantId,
        },
      })

      if (sameFile && settledImportStatuses.includes(sameFile.status)) {
        throw ExpectedQueryError.conflict(
          sameFile.status === "applying"
            ? "This file is being added right now. Wait a moment, then check the list."
            : "This file has already been added. Nothing was added again."
        )
      }

      if (sameFile) {
        return { id: sameFile.id, reused: true }
      }

      const batch = await tx.importBatch.create({
        data: {
          createdByUserId: input.actorUserId,
          duplicateRowCount: input.duplicateRowCount,
          existingMatchCount: input.existingMatchCount,
          importType: input.importType,
          sourceCsv: input.sourceCsv,
          status: "draft",
          tenantId: input.tenantId,
          totalRows: input.rows.length,
          validRows: input.validRows,
        },
        select: { id: true },
      })

      for (let start = 0; start < input.rows.length; start += 1000) {
        await tx.importBatchRow.createMany({
          data: input.rows.slice(start, start + 1000).map((row) => ({
            duplicateInFile: row.duplicateInFile,
            existingMatch: row.existingMatch,
            importBatchId: batch.id,
            payload: row.payload as Prisma.InputJsonValue,
            primaryValue: row.primaryValue ?? null,
            rowIndex: row.rowIndex,
            tenantId: input.tenantId,
          })),
        })
      }

      await createAuditLogEntry(
        {
          action: "import_batch.created",
          actorType: "user",
          actorUserId: input.actorUserId,
          entityId: batch.id,
          entityType: "ImportBatch",
          metadata: {
            duplicateRowCount: input.duplicateRowCount,
            existingMatchCount: input.existingMatchCount,
            importType: input.importType,
            totalRows: input.rows.length,
            validRows: input.validRows,
          },
          tenantId: input.tenantId,
        },
        tx as unknown as PrismaClient
      )

      return { id: batch.id, reused: false }
    },
    { maxWait: 10_000, timeout: 60_000 }
  )
}

const importBatchListSelect = {
  appliedAt: true,
  createdAt: true,
  createdByUser: { select: { email: true, fullName: true, id: true } },
  duplicateRowCount: true,
  errorMessage: true,
  existingMatchCount: true,
  id: true,
  importType: true,
  status: true,
  totalRows: true,
  validRows: true,
} satisfies Prisma.ImportBatchSelect

export type ImportKindSummary = {
  addedRows: number
  importType: string
  lastAddedAt: Date | null
  /** Saved or stopped batches still to be added. */
  waitingBatches: number
}

/** What has been imported, per kind, for the imports overview: one grouped query. */
export async function getImportKindSummaries(
  tenantId: string,
  prismaOverride?: PrismaClient
): Promise<ImportKindSummary[]> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const groups = await prisma.importBatch.groupBy({
    _count: { _all: true },
    _max: { appliedAt: true },
    _sum: { totalRows: true },
    by: ["importType", "status"],
    where: { tenantId },
  })
  const byKind = new Map<string, ImportKindSummary>()

  for (const group of groups) {
    const summary = byKind.get(group.importType) ?? {
      addedRows: 0,
      importType: group.importType,
      lastAddedAt: null,
      waitingBatches: 0,
    }
    if (group.status === "applied") {
      summary.addedRows += group._sum.totalRows ?? 0
      summary.lastAddedAt = group._max.appliedAt
    } else if (group.status === "draft" || group.status === "failed") {
      summary.waitingBatches += group._count._all
    }
    byKind.set(group.importType, summary)
  }

  return [...byKind.values()]
}

export async function listImportBatches(
  tenantId: string,
  filters: {
    cursor?: string | null
    importType?: ImportKind
    pageSize?: number
    search?: string | null
    sort?:
      | [
          (
            | "createdAt"
            | "createdBy"
            | "importType"
            | "reviewCount"
            | "status"
            | "totalRows"
          ),
          "asc" | "desc",
        ]
      | null
    status?: "draft" | "applied" | "failed" | null
  } = {},
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  const pageSize = filters.pageSize ?? 20
  const search = filters.search?.trim()
  const normalizedSearch = search?.replace(/\s+/g, "_")
  const orderBy: Prisma.ImportBatchOrderByWithRelationInput[] = (() => {
    if (!filters.sort) return [{ createdAt: "desc" }]

    const [field, direction] = filters.sort
    if (field === "createdBy") {
      return [{ createdByUser: { fullName: direction } }, { createdAt: "desc" }]
    }
    if (
      field === "createdAt" ||
      field === "importType" ||
      field === "status" ||
      field === "totalRows"
    ) {
      return [{ [field]: direction }, { createdAt: "desc" }]
    }
    if (field === "reviewCount") {
      return [
        { existingMatchCount: direction },
        { duplicateRowCount: direction },
        { createdAt: "desc" },
      ]
    }

    return [{ createdAt: "desc" }]
  })()

  // List rows carry only what the list shows: never the stored file or row
  // payloads, which can be megabytes for a large import.
  return prisma.importBatch.findMany({
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    where: {
      tenantId,
      ...(filters.importType ? { importType: filters.importType } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(search
        ? {
            OR: [
              { importType: { contains: normalizedSearch ?? search } },
              { status: { contains: search } },
              {
                createdByUser: {
                  fullName: { contains: search, mode: "insensitive" },
                },
              },
              {
                createdByUser: {
                  email: { contains: search, mode: "insensitive" },
                },
              },
            ],
          }
        : {}),
    },
    orderBy,
    select: importBatchListSelect,
    take: pageSize,
  })
}

/** Rows shown in a batch's details: enough to recognise the file. */
const IMPORT_BATCH_PREVIEW_ROWS = 20

const amountFieldByKind: Partial<Record<ImportKind, string>> = {
  charges: "amount",
  contributions: "amount",
  loan_migrations: "outstandingPrincipal",
  repayment_migrations: "amount",
}

export async function getImportBatch(
  input: {
    batchId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const batch = await prisma.importBatch.findFirst({
    select: {
      ...importBatchListSelect,
      rows: {
        orderBy: { rowIndex: "asc" },
        select: {
          duplicateInFile: true,
          existingMatch: true,
          id: true,
          payload: true,
          primaryValue: true,
          rowIndex: true,
        },
        take: IMPORT_BATCH_PREVIEW_ROWS,
      },
    },
    where: {
      id: input.batchId,
      tenantId: input.tenantId,
    },
  })

  if (!batch) {
    throw ExpectedQueryError.notFound("Import batch not found")
  }

  // Money files show their total, summed in the database.
  const amountField = amountFieldByKind[batch.importType as ImportKind]
  let totalAmount: number | null = null
  if (amountField) {
    const [row] = await prisma.$queryRaw<Array<{ total: string | null }>>`
      SELECT sum((payload ->> ${amountField})::numeric)::text AS total
      FROM import_batch_rows
      WHERE import_batch_id = ${batch.id}::uuid AND tenant_id = ${input.tenantId}::uuid
    `
    totalAmount = row?.total == null ? 0 : Number(row.total)
  }

  return { ...batch, totalAmount }
}

export async function getImportBatchKind(
  input: {
    batchId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const batch = await prisma.importBatch.findFirst({
    select: {
      importType: true,
    },
    where: {
      id: input.batchId,
      tenantId: input.tenantId,
    },
  })

  if (!batch) {
    throw ExpectedQueryError.notFound("Import batch not found")
  }

  return batch.importType as ImportKind
}

const importDateFields = [
  "assessedAt",
  "disbursedAt",
  "firstRepaymentDueAt",
  "joinedAt",
  "postedAt",
  "requestedAt",
]

/** Saved rows are JSON, so their dates come back as text: make them dates again. */
export function reviveImportDates(payload: Prisma.JsonValue): Prisma.JsonValue {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payload
  }
  const row: Record<string, unknown> = { ...payload }
  for (const field of importDateFields) {
    const value = row[field]
    if (typeof value === "string" && value) {
      const date = new Date(value)
      if (!Number.isNaN(date.getTime())) row[field] = date
    }
  }
  return row as Prisma.JsonValue
}

function importFailureMessage(error: unknown) {
  return error instanceof ExpectedQueryError
    ? error.message
    : "Something went wrong while adding this file. Nothing was added."
}

export async function applyImportBatch(
  input: {
    actorUserId: string
    batchId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const batch = await prisma.importBatch.findFirst({
    select: { id: true, importType: true, status: true, updatedAt: true },
    where: {
      id: input.batchId,
      tenantId: input.tenantId,
    },
  })

  if (!batch) {
    throw ExpectedQueryError.notFound("Import batch not found")
  }

  if (batch.status === "applied") {
    throw ExpectedQueryError.conflict(
      "This import batch has already been applied."
    )
  }
  // Repayment files are all or nothing now; "partial" survives only on
  // batches written by the old row-by-row writer.
  if (batch.status === "partial") {
    throw ExpectedQueryError.precondition(
      "Part of this file was added before it stopped. Check the records before adding anything again."
    )
  }

  const kind = batch.importType as ImportKind
  await assertMemberRecordImportsOpen(input.tenantId, prisma)

  // Claim the batch so two clicks (or two people) cannot both add it. Every
  // kind is written in one transaction, so a batch left "applying" by a crash
  // wrote nothing and can be claimed again after ten minutes.
  const staleBefore = new Date(Date.now() - 10 * 60 * 1000)
  const claim = await prisma.importBatch.updateMany({
    data: { errorMessage: null, status: "applying" },
    where: {
      id: batch.id,
      tenantId: input.tenantId,
      OR: [
        { status: { in: ["draft", "failed"] } },
        { status: "applying", updatedAt: { lt: staleBefore } },
      ],
    },
  })

  if (claim.count !== 1) {
    throw ExpectedQueryError.conflict(
      "This import batch has already been applied or is being applied."
    )
  }

  const rows = (
    await prisma.importBatchRow.findMany({
      orderBy: { rowIndex: "asc" },
      select: { payload: true },
      where: { importBatchId: batch.id, tenantId: input.tenantId },
    })
  ).map((row) => reviveImportDates(row.payload))

  try {
    return await prisma.$transaction(
      async (tx) => {
        const client = tx as unknown as PrismaClient
        const result = await applyImportRows(
          {
            actorUserId: input.actorUserId,
            batchId: batch.id,
            kind,
            rows,
            tenantId: input.tenantId,
          },
          client
        )

        await tx.importBatch.update({
          data: {
            appliedAt: new Date(),
            errorMessage: null,
            status: "applied",
          },
          where: { id: batch.id },
        })
        await createAuditLogEntry(
          {
            action: "import_batch.applied",
            actorType: "user",
            actorUserId: input.actorUserId,
            entityId: batch.id,
            entityType: "ImportBatch",
            metadata: { importType: kind, processed: result.processed },
            tenantId: input.tenantId,
          },
          client
        )

        return result
      },
      {
        // Repayments allocate across schedule items as live posts do, so
        // they need the same serializable isolation.
        ...(kind === "repayment_migrations"
          ? { isolationLevel: "Serializable" as const }
          : {}),
        maxWait: 10_000,
        timeout: 120_000,
      }
    )
  } catch (error) {
    await prisma.importBatch.updateMany({
      data: { errorMessage: importFailureMessage(error), status: "failed" },
      where: { id: batch.id, status: "applying", tenantId: input.tenantId },
    })

    throw error
  }
}

export async function getImportReferenceData(
  tenantId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const [members, deductionSources, loanProducts, chargeDefinitions] =
    await Promise.all([
      // Every member number (not a capped page), so a large cooperative's
      // file is checked against all of its members.
      prisma.member.findMany({
        where: { tenantId },
        select: { memberNumber: true },
      }),
      prisma.deductionSource.findMany({
        where: { tenantId },
        select: { name: true },
      }),
      prisma.loanProduct.findMany({
        where: { tenantId },
        select: { code: true, name: true },
      }),
      prisma.chargeDefinition.findMany({
        where: { tenantId },
        select: { code: true },
      }),
    ])

  return {
    chargeDefinitionCodes: chargeDefinitions.map((item) => item.code),
    deductionSourceNames: deductionSources.map((item) => item.name),
    loanProductCodes: loanProducts
      .map((item) => item.code)
      .filter((code): code is string => Boolean(code))
      .map((code) => code.toUpperCase()),
    loanProductNames: loanProducts.map((item) => item.name),
    memberNumbers: members.map((item) => item.memberNumber),
    counts: {
      chargeDefinitions: chargeDefinitions.length,
      deductionSources: deductionSources.length,
      loanProducts: loanProducts.length,
      members: members.length,
    },
  }
}

export async function listActiveDeductionSources(
  tenantId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.deductionSource.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
    select: {
      externalReference: true,
      id: true,
      name: true,
      type: true,
    },
    where: {
      isActive: true,
      tenantId,
    },
  })
}

// Workplaces are the member-facing name for deduction sources: the employer or
// office that pays members' monthly amounts. One query plus one grouped count.
export async function listWorkplaces(
  tenantId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const [workplaces, counts] = await Promise.all([
    prisma.deductionSource.findMany({
      orderBy: { name: "asc" },
      select: { id: true, isActive: true, name: true },
      where: { tenantId },
    }),
    prisma.member.groupBy({
      _count: { _all: true },
      by: ["deductionSourceId"],
      where: {
        deductionSourceId: { not: null },
        status: { not: "exited" },
        tenantId,
      },
    }),
  ])
  const countById = new Map(
    counts.map((count) => [count.deductionSourceId, count._count._all])
  )

  return workplaces.map((workplace) => ({
    ...workplace,
    memberCount: countById.get(workplace.id) ?? 0,
  }))
}

function normalizeWorkplaceName(name: string) {
  const trimmed = name.trim().replace(/\s+/g, " ")
  if (trimmed.length < 2 || trimmed.length > 120) {
    throw ExpectedQueryError.validation("Enter a workplace name.")
  }
  return trimmed
}

async function assertWorkplaceNameFree(input: {
  excludeId?: string
  name: string
  prisma: PrismaClient
  tenantId: string
}) {
  const existing = await input.prisma.deductionSource.findFirst({
    select: { id: true },
    where: {
      name: { equals: input.name, mode: "insensitive" },
      tenantId: input.tenantId,
      ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
    },
  })
  if (existing) {
    throw ExpectedQueryError.conflict(
      "A workplace with this name already exists."
    )
  }
}

export async function createWorkplace(
  input: { actorUserId: string; name: string; tenantId: string },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  const name = normalizeWorkplaceName(input.name)
  await assertWorkplaceNameFree({ name, prisma, tenantId: input.tenantId })

  return prisma.$transaction(async (tx) => {
    const workplace = await tx.deductionSource.create({
      data: { name, tenantId: input.tenantId, type: "employer_payroll" },
      select: { id: true, isActive: true, name: true },
    })
    await tx.auditLog.create({
      data: {
        action: "deduction_source.created",
        actorType: "user",
        actorUserId: input.actorUserId,
        entityId: workplace.id,
        entityType: "DeductionSource",
        metadata: { name },
        occurredAt: new Date(),
        tenantId: input.tenantId,
      },
    })
    return workplace
  })
}

export async function renameWorkplace(
  input: { actorUserId: string; id: string; name: string; tenantId: string },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  const name = normalizeWorkplaceName(input.name)
  await assertWorkplaceNameFree({
    excludeId: input.id,
    name,
    prisma,
    tenantId: input.tenantId,
  })

  return prisma.$transaction(async (tx) => {
    const current = await tx.deductionSource.findFirst({
      select: { name: true },
      where: { id: input.id, tenantId: input.tenantId },
    })
    if (!current) throw ExpectedQueryError.notFound("Workplace not found.")

    const workplace = await tx.deductionSource.update({
      data: { name },
      select: { id: true, isActive: true, name: true },
      where: { id: input.id },
    })
    await tx.auditLog.create({
      data: {
        action: "deduction_source.renamed",
        actorType: "user",
        actorUserId: input.actorUserId,
        entityId: workplace.id,
        entityType: "DeductionSource",
        metadata: { from: current.name, to: name },
        occurredAt: new Date(),
        tenantId: input.tenantId,
      },
    })
    return workplace
  })
}

export async function importDeductionSources(
  input: {
    actorUserId: string
    rows: Array<{
      externalReference?: string
      name: string
      type: DeductionSourceType
    }>
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<ImportResult> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  await assertMemberRecordImportsOpen(input.tenantId, prisma)
  const normalizedNames = input.rows.map((row) => row.name.trim().toLowerCase())
  const duplicateNames = normalizedNames.filter(
    (name, index) => normalizedNames.indexOf(name) !== index
  )

  if (duplicateNames.length > 0) {
    throw ExpectedQueryError.precondition(
      "Remove duplicate collection-source names before importing."
    )
  }

  return runAtomic(prisma, async (tx) => {
    const existingSources = await tx.deductionSource.findMany({
      include: {
        _count: {
          select: { collectionSourceContributionBatches: true },
        },
      },
      where: {
        name: { in: input.rows.map((row) => row.name) },
        tenantId: input.tenantId,
      },
    })
    const existingByName = new Map(
      existingSources.map((source) => [source.name, source])
    )
    const createdIds: string[] = []
    const updatedIds: string[] = []

    for (const row of input.rows) {
      const existing = existingByName.get(row.name)
      const externalReference = row.externalReference?.trim() || null

      if (existing) {
        const changesHistoricalMeaning =
          existing.type !== row.type ||
          existing.externalReference !== externalReference

        if (
          changesHistoricalMeaning &&
          existing._count.collectionSourceContributionBatches > 0
        ) {
          throw ExpectedQueryError.precondition(
            `${row.name} already has collection batches. Use the live correction workflow instead of changing its imported type or external reference.`
          )
        }

        const updated = await tx.deductionSource.update({
          data: {
            externalReference,
            type: row.type,
          },
          where: { id: existing.id },
        })
        updatedIds.push(updated.id)
        continue
      }

      const created = await tx.deductionSource.create({
        data: {
          externalReference,
          isActive: true,
          name: row.name,
          tenantId: input.tenantId,
          type: row.type,
        },
      })
      createdIds.push(created.id)
    }

    await createAuditLogEntry(
      {
        action: "import.deduction_sources",
        actorType: "user",
        actorUserId: input.actorUserId,
        entityType: "DeductionSource",
        metadata: {
          createdIds,
          processed: input.rows.length,
          updatedIds,
        },
        tenantId: input.tenantId,
      },
      tx as unknown as PrismaClient
    )

    return { processed: input.rows.length }
  })
}

type LoanProductImportInput = {
  actorUserId: string
  rows: Array<{
    code?: string
    loanType: "normal" | "quick"
    maxSavingsMultiple: number
    name: string
    termMonths: number
  }>
  tenantId: string
}

function normalizeLoanProductRows(rows: LoanProductImportInput["rows"]) {
  const normalizedRows = rows.map((row) => ({
    ...row,
    code: row.code?.trim().toUpperCase() || null,
    name: row.name.trim(),
  }))
  const normalizedNames = normalizedRows.map((row) => row.name.toLowerCase())
  const normalizedCodes = normalizedRows
    .map((row) => row.code)
    .filter((code): code is string => Boolean(code))

  if (normalizedRows.some((row) => !row.name)) {
    throw ExpectedQueryError.precondition("Every loan product needs a name.")
  }
  if (
    normalizedRows.some(
      (row) => !Number.isSafeInteger(row.termMonths) || row.termMonths <= 0
    )
  ) {
    throw ExpectedQueryError.precondition(
      "Every loan-product term must be a positive whole number of months."
    )
  }
  if (
    normalizedRows.some(
      (row) =>
        !Number.isFinite(row.maxSavingsMultiple) || row.maxSavingsMultiple <= 0
    )
  ) {
    throw ExpectedQueryError.precondition(
      "Every loan-product savings multiple must be greater than zero."
    )
  }
  if (new Set(normalizedNames).size !== normalizedNames.length) {
    throw ExpectedQueryError.precondition(
      "Remove duplicate loan-product names before importing."
    )
  }
  if (new Set(normalizedCodes).size !== normalizedCodes.length) {
    throw ExpectedQueryError.precondition(
      "Remove duplicate loan-product codes before importing."
    )
  }

  return normalizedRows
}

async function applyLoanProductRows(
  input: LoanProductImportInput,
  prisma: PrismaClient | Prisma.TransactionClient
): Promise<ImportResult> {
  const rows = normalizeLoanProductRows(input.rows)
  const existingProducts = await prisma.loanProduct.findMany({
    include: {
      _count: {
        select: { loanRequests: true, loans: true },
      },
    },
    where: { tenantId: input.tenantId },
  })
  const existingNormalizedNames = new Set<string>()
  const existingNormalizedCodes = new Set<string>()

  for (const product of existingProducts) {
    const normalizedName = product.name.trim().toLowerCase()
    if (existingNormalizedNames.has(normalizedName)) {
      throw ExpectedQueryError.conflict(
        "Existing loan-product names are ambiguous after case normalization. Resolve the duplicate names in the live correction workflow before importing."
      )
    }
    existingNormalizedNames.add(normalizedName)

    const normalizedCode = product.code?.trim().toUpperCase()
    if (normalizedCode && existingNormalizedCodes.has(normalizedCode)) {
      throw ExpectedQueryError.conflict(
        "Existing loan-product codes are ambiguous after case normalization. Resolve the duplicate codes in the live correction workflow before importing."
      )
    }
    if (normalizedCode) existingNormalizedCodes.add(normalizedCode)
  }

  const byName = new Map(
    existingProducts.map((product) => [product.name.toLowerCase(), product])
  )
  const byCode = new Map(
    existingProducts
      .filter((product) => Boolean(product.code))
      .map((product) => [product.code?.toUpperCase() as string, product])
  )
  const createdIds: string[] = []
  const updatedIds: string[] = []
  const changes: Array<Record<string, unknown>> = []

  for (const row of rows) {
    const nameMatch = byName.get(row.name.toLowerCase())
    const codeMatch = row.code ? byCode.get(row.code) : undefined

    if (nameMatch && codeMatch && nameMatch.id !== codeMatch.id) {
      throw ExpectedQueryError.conflict(
        `${row.name} conflicts with another loan product using code ${row.code}. Use the live correction workflow to resolve the identity conflict.`
      )
    }

    const existing = codeMatch ?? nameMatch
    if (!existing) {
      const created = await prisma.loanProduct.create({
        data: {
          code: row.code,
          isActive: true,
          loanType: row.loanType,
          maxSavingsMultiple: row.maxSavingsMultiple,
          name: row.name,
          tenantId: input.tenantId,
          termMonths: row.termMonths,
        },
      })
      createdIds.push(created.id)
      continue
    }

    const before = {
      code: existing.code,
      isActive: existing.isActive,
      loanType: existing.loanType,
      maxSavingsMultiple: Number(existing.maxSavingsMultiple),
      name: existing.name,
      termMonths: existing.termMonths,
    }
    const after = {
      code: row.code,
      isActive: true,
      loanType: row.loanType,
      maxSavingsMultiple: row.maxSavingsMultiple,
      name: row.name,
      termMonths: row.termMonths,
    }
    const changed = JSON.stringify(before) !== JSON.stringify(after)

    if (
      changed &&
      (existing._count.loanRequests > 0 || existing._count.loans > 0)
    ) {
      throw ExpectedQueryError.precondition(
        `${existing.name} is already used by loan records. Use the live loan-product correction workflow instead of changing its imported policy.`
      )
    }

    if (!changed) {
      continue
    }

    const updated = await prisma.loanProduct.update({
      data: after,
      where: { id: existing.id },
    })
    updatedIds.push(updated.id)
    changes.push({ after, before, id: existing.id })
  }

  await createAuditLogEntry(
    {
      action: "import.loan_products",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityType: "LoanProduct",
      metadata: {
        changes,
        createdIds,
        processed: rows.length,
        updatedIds,
      },
      tenantId: input.tenantId,
    },
    prisma as PrismaClient
  )

  return { processed: rows.length }
}

export async function importLoanProducts(
  input: LoanProductImportInput,
  prismaOverride?: PrismaClient
): Promise<ImportResult> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  await assertMemberRecordImportsOpen(input.tenantId, prisma)
  normalizeLoanProductRows(input.rows)

  return runAtomic(prisma, (tx) => applyLoanProductRows(input, tx))
}

export async function importMembers(
  input: {
    actorUserId: string
    rows: Parameters<typeof postImportedMembers>[1]["rows"]
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<ImportResult> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  await assertMemberRecordImportsOpen(input.tenantId, prisma)

  return runAtomic(prisma, async (db) => {
    const result = await postImportedMembers(db, input)
    await createAuditLogEntry(
      {
        action: "import.members",
        actorType: "user",
        actorUserId: input.actorUserId,
        entityType: "Member",
        metadata: { processed: result.processed },
        tenantId: input.tenantId,
      },
      db
    )
    return result
  })
}

export async function importContributions(
  input: Parameters<typeof postImportedContributions>[1],
  prismaOverride?: PrismaClient
): Promise<ImportResult> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  await assertMemberRecordImportsOpen(input.tenantId, prisma)

  return runAtomic(prisma, async (db) => {
    const result = await postImportedContributions(db, input)
    await createAuditLogEntry(
      {
        action: "import.contributions",
        actorType: "user",
        actorUserId: input.actorUserId,
        entityType: "Contribution",
        metadata: { processed: result.processed },
        tenantId: input.tenantId,
      },
      db
    )
    return result
  })
}

export async function importCharges(
  input: Parameters<typeof postImportedCharges>[1],
  prismaOverride?: PrismaClient
): Promise<ImportResult> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  await assertMemberRecordImportsOpen(input.tenantId, prisma)

  return runAtomic(prisma, async (db) => {
    const result = await postImportedCharges(db, input)
    await createAuditLogEntry(
      {
        action: "import.charges",
        actorType: "user",
        actorUserId: input.actorUserId,
        entityType: "ChargeApplication",
        metadata: { processed: result.processed },
        tenantId: input.tenantId,
      },
      db
    )
    return result
  })
}

export async function importLoanMigrations(
  input: Parameters<typeof postImportedLoanMigrations>[1],
  prismaOverride?: PrismaClient
): Promise<ImportResult> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  await assertMemberRecordImportsOpen(input.tenantId, prisma)

  return runAtomic(prisma, async (db) => {
    const result = await postImportedLoanMigrations(db, input)
    await createAuditLogEntry(
      {
        action: "import.loans",
        actorType: "user",
        actorUserId: input.actorUserId,
        entityType: "Loan",
        metadata: { processed: result.processed },
        tenantId: input.tenantId,
      },
      db
    )
    return result
  })
}

export async function importRepaymentMigrations(
  input: {
    actorUserId: string
    rows: Array<{
      amount: number
      loanProductName: string
      memberNumber: string
      reference?: string
    }>
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<ImportResult> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  await assertMemberRecordImportsOpen(input.tenantId, prisma)

  const loanIds = await resolveImportedRepaymentLoans(prisma, input)
  const [cash, loanReceivable] = await Promise.all([
    getLedgerAccountByCode(input.tenantId, "2000", prisma),
    getLedgerAccountByCode(input.tenantId, "1100", prisma),
  ])
  if (!cash || !loanReceivable) {
    throw new QueryInfrastructureError(
      "Ledger accounts not initialized for this cooperative"
    )
  }
  let processed = 0

  // Runs in the import batch's transaction (applyImportBatch): one failing
  // row rolls back every repayment in the file.
  for (const [index, row] of input.rows.entries()) {
    await postRepaymentInTransaction(
      {
        accounts: { cash, loanReceivable },
        actorUserId: input.actorUserId,
        amount: row.amount,
        loanId: loanIds[index]!,
        reference: row.reference,
        sourceType: "import",
        tenantId: input.tenantId,
      },
      prisma
    )

    processed += 1
  }

  await createAuditLogEntry(
    {
      action: "import.repayments",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityType: "Repayment",
      metadata: { processed },
      tenantId: input.tenantId,
    },
    prisma
  )

  return { processed }
}
