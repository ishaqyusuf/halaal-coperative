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
import { createAuditLogEntry } from "./audit"
import { applyCharge } from "./charges"
import { recordContribution } from "./contributions"
import { postRepayment } from "./loans"

type ImportResult = {
  processed: number
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
      throw new Error("Unsupported import kind")
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
    throw new Error(
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
    throw new Error(
      "Member record imports are locked because member ledger backfill has already started. Finish migration or use live correction workflows after go-live."
    )
  }
}

async function applyImportRows(
  input: {
    actorUserId: string
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
    sourceCsv: string
    tenantId: string
    validRows: number
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  await assertMemberRecordImportsOpen(input.tenantId, prisma)

  return prisma.$transaction(async (tx) => {
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
        rows: {
          create: input.rows.map((row) => ({
            duplicateInFile: row.duplicateInFile,
            existingMatch: row.existingMatch,
            payload: row.payload as Prisma.InputJsonValue,
            primaryValue: row.primaryValue ?? null,
            rowIndex: row.rowIndex,
            tenantId: input.tenantId,
          })),
        },
      },
      include: {
        createdByUser: { select: { id: true, fullName: true, email: true } },
        rows: {
          orderBy: { rowIndex: "asc" },
          take: 5,
        },
      },
    })

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

    return batch
  })
}

export async function listImportBatches(
  tenantId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.importBatch.findMany({
    where: { tenantId },
    include: {
      createdByUser: { select: { id: true, fullName: true, email: true } },
      rows: {
        orderBy: { rowIndex: "asc" },
        take: 5,
      },
      _count: {
        select: {
          rows: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  })
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
    throw new Error("Import batch not found")
  }

  return batch.importType as ImportKind
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
    where: {
      id: input.batchId,
      tenantId: input.tenantId,
    },
    include: {
      rows: {
        orderBy: { rowIndex: "asc" },
      },
    },
  })

  if (!batch) {
    throw new Error("Import batch not found")
  }

  if (batch.status === "applied") {
    throw new Error("This import batch has already been applied.")
  }

  await assertMemberRecordImportsOpen(input.tenantId, prisma)

  try {
    const result = await applyImportRows(
      {
        actorUserId: input.actorUserId,
        kind: batch.importType as ImportKind,
        rows: batch.rows.map((row) => row.payload),
        tenantId: input.tenantId,
      },
      prisma
    )

    await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        appliedAt: new Date(),
        errorMessage: null,
        status: "applied",
      },
    })

    await createAuditLogEntry(
      {
        action: "import_batch.applied",
        actorType: "user",
        actorUserId: input.actorUserId,
        entityId: batch.id,
        entityType: "ImportBatch",
        metadata: {
          importType: batch.importType,
          processed: result.processed,
        },
        tenantId: input.tenantId,
      },
      prisma
    )

    return result
  } catch (error) {
    await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        errorMessage:
          error instanceof Error
            ? error.message
            : "Import batch application failed.",
        status: "failed",
      },
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
      prisma.member.findMany({
        where: { tenantId },
        select: { id: true, fullName: true, memberNumber: true },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
      prisma.deductionSource.findMany({
        where: { tenantId },
        select: { id: true, name: true },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.loanProduct.findMany({
        where: { tenantId },
        select: {
          code: true,
          id: true,
          loanType: true,
          name: true,
          termMonths: true,
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.chargeDefinition.findMany({
        where: { tenantId },
        select: { id: true, code: true, name: true },
        orderBy: { createdAt: "desc" },
        take: 200,
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

function buildRepaymentSchedule(input: {
  monthlyRepaymentAmount?: number
  principalAmount: number
  startDate: Date
  termMonths: number
}) {
  const monthlyAmount =
    input.monthlyRepaymentAmount && input.monthlyRepaymentAmount > 0
      ? Number(input.monthlyRepaymentAmount.toFixed(2))
      : Number((input.principalAmount / input.termMonths).toFixed(2))

  return Array.from({ length: input.termMonths }, (_, index) => {
    const dueAt = new Date(input.startDate)
    dueAt.setUTCMonth(dueAt.getUTCMonth() + index)

    return {
      amountPaid: 0,
      chargeDue: 0,
      dueAt,
      installmentNumber: index + 1,
      principalDue: monthlyAmount,
      status: "pending" as const,
      totalDue: monthlyAmount,
    }
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

  let processed = 0

  for (const row of input.rows) {
    await prisma.deductionSource.upsert({
      where: {
        tenantId_name: {
          name: row.name,
          tenantId: input.tenantId,
        },
      },
      update: {
        externalReference: row.externalReference ?? null,
        type: row.type,
      },
      create: {
        externalReference: row.externalReference ?? null,
        isActive: true,
        name: row.name,
        tenantId: input.tenantId,
        type: row.type,
      },
    })
    processed += 1
  }

  await createAuditLogEntry(
    {
      action: "import.deduction_sources",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityType: "DeductionSource",
      metadata: { processed },
      tenantId: input.tenantId,
    },
    prisma
  )

  return { processed }
}

export async function importLoanProducts(
  input: {
    actorUserId: string
    rows: Array<{
      code?: string
      loanType: "normal" | "quick"
      maxSavingsMultiple: number
      name: string
      termMonths: number
    }>
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<ImportResult> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  await assertMemberRecordImportsOpen(input.tenantId, prisma)

  let processed = 0

  for (const row of input.rows) {
    const code = row.code?.trim().toUpperCase() || null

    await prisma.loanProduct.upsert({
      where: {
        tenantId_name: {
          name: row.name,
          tenantId: input.tenantId,
        },
      },
      update: {
        code,
        isActive: true,
        loanType: row.loanType,
        maxSavingsMultiple: row.maxSavingsMultiple,
        termMonths: row.termMonths,
      },
      create: {
        code,
        isActive: true,
        loanType: row.loanType,
        maxSavingsMultiple: row.maxSavingsMultiple,
        name: row.name,
        tenantId: input.tenantId,
        termMonths: row.termMonths,
      },
    })
    processed += 1
  }

  await createAuditLogEntry(
    {
      action: "import.loan_products",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityType: "LoanProduct",
      metadata: { processed },
      tenantId: input.tenantId,
    },
    prisma
  )

  return { processed }
}

export async function importMembers(
  input: {
    actorUserId: string
    rows: Array<{
      deductionSourceName?: string
      address?: string
      email?: string
      fullName: string
      governmentIdNumber?: string
      joinedAt: Date
      kycDocumentType?: string
      kycReviewNotes?: string
      kycStatus?: KycStatus
      memberNumber: string
      memberType: MemberType
      monthlyCommitment?: number
      occupation?: string
      openingSavingsBalance?: number
      phoneNumber?: string
      status?: MemberStatus
    }>
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<ImportResult> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  await assertMemberRecordImportsOpen(input.tenantId, prisma)

  let processed = 0

  for (const row of input.rows) {
    const deductionSource = row.deductionSourceName
      ? await prisma.deductionSource.findFirst({
          where: {
            name: row.deductionSourceName,
            tenantId: input.tenantId,
          },
        })
      : null

    const member = await prisma.member.upsert({
      where: {
        tenantId_memberNumber: {
          memberNumber: row.memberNumber,
          tenantId: input.tenantId,
        },
      },
      update: {
        deductionSourceId: deductionSource?.id ?? null,
        fullName: row.fullName,
        joinedAt: row.joinedAt,
        memberType: row.memberType,
        status: row.status ?? "active",
        ...(row.address !== undefined && {
          address: row.address.trim() || null,
        }),
        ...(row.email !== undefined && {
          email: row.email.trim() || null,
        }),
        ...(row.governmentIdNumber !== undefined && {
          governmentIdNumber: row.governmentIdNumber.trim() || null,
        }),
        ...(row.kycDocumentType !== undefined && {
          kycDocumentType: row.kycDocumentType.trim() || null,
        }),
        ...(row.kycReviewNotes !== undefined && {
          kycReviewNotes: row.kycReviewNotes.trim() || null,
        }),
        ...(row.kycStatus !== undefined && { kycStatus: row.kycStatus }),
        ...(row.occupation !== undefined && {
          occupation: row.occupation.trim() || null,
        }),
        ...(row.openingSavingsBalance !== undefined && {
          totalSavingsSnapshot: row.openingSavingsBalance,
        }),
        ...(row.phoneNumber !== undefined && {
          phoneNumber: row.phoneNumber.trim() || null,
        }),
      },
      create: {
        address: row.address?.trim() || null,
        deductionSourceId: deductionSource?.id ?? null,
        email: row.email?.trim() || null,
        fullName: row.fullName,
        governmentIdNumber: row.governmentIdNumber?.trim() || null,
        joinedAt: row.joinedAt,
        kycDocumentType: row.kycDocumentType?.trim() || null,
        kycReviewNotes: row.kycReviewNotes?.trim() || null,
        kycStatus: row.kycStatus ?? "not_started",
        memberNumber: row.memberNumber,
        memberType: row.memberType,
        occupation: row.occupation?.trim() || null,
        phoneNumber: row.phoneNumber?.trim() || null,
        status: row.status ?? "active",
        tenantId: input.tenantId,
        totalSavingsSnapshot: row.openingSavingsBalance ?? 0,
      },
    })

    if (row.monthlyCommitment && row.monthlyCommitment > 0) {
      const existingPlan = await prisma.contributionPlan.findFirst({
        orderBy: { startsAt: "desc" },
        where: {
          isActive: true,
          memberId: member.id,
          tenantId: input.tenantId,
        },
      })

      if (existingPlan) {
        await prisma.contributionPlan.update({
          data: {
            amount: row.monthlyCommitment,
            name: "Monthly commitment",
            startsAt: row.joinedAt,
          },
          where: { id: existingPlan.id },
        })
      } else {
        await prisma.contributionPlan.create({
          data: {
            amount: row.monthlyCommitment,
            interval: "monthly",
            isActive: true,
            memberId: member.id,
            name: "Monthly commitment",
            startsAt: row.joinedAt,
            tenantId: input.tenantId,
          },
        })
      }

      const existingAmountLog = await prisma.memberAmountLog.findFirst({
        where: {
          effectiveFrom: row.joinedAt,
          memberId: member.id,
          tenantId: input.tenantId,
        },
      })

      if (existingAmountLog) {
        await prisma.memberAmountLog.update({
          data: {
            amount: row.monthlyCommitment,
            notes: "Imported initial monthly commitment.",
          },
          where: { id: existingAmountLog.id },
        })
      } else {
        await prisma.memberAmountLog.create({
          data: {
            amount: row.monthlyCommitment,
            createdByUserId: input.actorUserId,
            effectiveFrom: row.joinedAt,
            memberId: member.id,
            notes: "Imported initial monthly commitment.",
            tenantId: input.tenantId,
          },
        })
      }
    }
    processed += 1
  }

  await createAuditLogEntry(
    {
      action: "import.members",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityType: "Member",
      metadata: { processed },
      tenantId: input.tenantId,
    },
    prisma
  )

  return { processed }
}

export async function importContributions(
  input: {
    actorUserId: string
    rows: Array<{
      amount: number
      channel: "cash" | "manual" | "payroll" | "transfer"
      committedAmount?: number
      extraSavingsAmount?: number
      memberNumber: string
      periodLabel?: string
      postedAt: Date
      reference?: string
    }>
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<ImportResult> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  await assertMemberRecordImportsOpen(input.tenantId, prisma)

  let processed = 0

  for (const row of input.rows) {
    const member = await prisma.member.findFirst({
      where: {
        memberNumber: row.memberNumber,
        tenantId: input.tenantId,
      },
    })

    if (!member) {
      throw new Error(
        `Member not found for contribution import: ${row.memberNumber}`
      )
    }

    await recordContribution(
      {
        actorUserId: input.actorUserId,
        amount: row.amount,
        channel: row.channel,
        committedAmount: row.committedAmount,
        extraSavingsAmount: row.extraSavingsAmount,
        memberId: member.id,
        periodLabel: row.periodLabel,
        postedAt: row.postedAt,
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
      action: "import.contributions",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityType: "Contribution",
      metadata: { processed },
      tenantId: input.tenantId,
    },
    prisma
  )

  return { processed }
}

export async function importCharges(
  input: {
    actorUserId: string
    rows: Array<{
      amount: number
      assessedAt: Date
      code: string
      kind: "fixed" | "percentage"
      memberNumber: string
      name: string
      notes?: string
    }>
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<ImportResult> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  await assertMemberRecordImportsOpen(input.tenantId, prisma)

  let processed = 0

  for (const row of input.rows) {
    const member = await prisma.member.findFirst({
      where: {
        memberNumber: row.memberNumber,
        tenantId: input.tenantId,
      },
    })

    if (!member) {
      throw new Error(`Member not found for charge import: ${row.memberNumber}`)
    }

    const chargeDefinition = await prisma.chargeDefinition.upsert({
      where: {
        tenantId_code: {
          code: row.code,
          tenantId: input.tenantId,
        },
      },
      update: {
        amount: row.amount,
        isActive: true,
        kind: row.kind,
        name: row.name,
      },
      create: {
        amount: row.amount,
        appliesToMembers: true,
        code: row.code,
        isActive: true,
        kind: row.kind,
        name: row.name,
        tenantId: input.tenantId,
      },
    })

    await applyCharge(
      {
        actorUserId: input.actorUserId,
        amount: row.amount,
        assessedAt: row.assessedAt,
        chargeDefinitionId: chargeDefinition.id,
        memberId: member.id,
        notes: row.notes,
        sourceType: "import",
        tenantId: input.tenantId,
      },
      prisma
    )

    processed += 1
  }

  await createAuditLogEntry(
    {
      action: "import.charges",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityType: "ChargeApplication",
      metadata: { processed },
      tenantId: input.tenantId,
    },
    prisma
  )

  return { processed }
}

export async function importLoanMigrations(
  input: {
    actorUserId: string
    rows: Array<{
      disbursedAt?: Date
      extraMonthlySavingsAmount?: number
      firstRepaymentDueAt?: Date
      loanProductName: string
      loanType: "normal" | "quick"
      memberNumber: string
      monthlyRepaymentAmount?: number
      outstandingPrincipal: number
      principalAmount: number
      requestedAt: Date
      status: LoanStatus
      termMonths: number
    }>
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<ImportResult> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  await assertMemberRecordImportsOpen(input.tenantId, prisma)

  let processed = 0

  for (const row of input.rows) {
    const member = await prisma.member.findFirst({
      where: {
        memberNumber: row.memberNumber,
        tenantId: input.tenantId,
      },
    })

    if (!member) {
      throw new Error(`Member not found for loan import: ${row.memberNumber}`)
    }

    const loanProduct = await prisma.loanProduct.upsert({
      where: {
        tenantId_name: {
          name: row.loanProductName,
          tenantId: input.tenantId,
        },
      },
      update: {
        isActive: true,
        loanType: row.loanType,
        maxSavingsMultiple: 2,
        termMonths: row.termMonths,
      },
      create: {
        isActive: true,
        loanType: row.loanType,
        maxSavingsMultiple: 2,
        name: row.loanProductName,
        tenantId: input.tenantId,
        termMonths: row.termMonths,
      },
    })

    const estimatedMonthlyServicing =
      row.monthlyRepaymentAmount && row.monthlyRepaymentAmount > 0
        ? Number(row.monthlyRepaymentAmount.toFixed(2))
        : Number((row.principalAmount / row.termMonths).toFixed(2))

    await prisma.$transaction(async (tx) => {
      const request = await tx.loanRequest.create({
        data: {
          availablePoolSnapshot: 0,
          createdByUserId: input.actorUserId,
          eligibleAmountSnapshot: Number(member.totalSavingsSnapshot),
          estimatedMonthlyServicing,
          extraMonthlySavingsAmount: row.extraMonthlySavingsAmount ?? 0,
          loanProductId: loanProduct.id,
          memberId: member.id,
          requestedAmount: row.principalAmount,
          requestedAt: row.requestedAt,
          requestedTermMonths: row.termMonths,
          reviewNotes: "Imported from migration workflow.",
          status: "approved",
          tenantId: input.tenantId,
        },
      })

      await tx.loanApproval.create({
        data: {
          action: "approved",
          actedAt: row.requestedAt,
          actorUserId: input.actorUserId,
          loanRequestId: request.id,
          notes: "Approved during historical import.",
          tenantId: input.tenantId,
        },
      })

      const loan = await tx.loan.create({
        data: {
          disbursedAt: row.disbursedAt ?? null,
          estimatedMonthlyServicing,
          extraMonthlySavingsAmount: row.extraMonthlySavingsAmount ?? 0,
          firstRepaymentDueAt: row.firstRepaymentDueAt ?? null,
          loanProductId: loanProduct.id,
          loanRequestId: request.id,
          memberId: member.id,
          outstandingPrincipal: row.outstandingPrincipal,
          principalAmount: row.principalAmount,
          status: row.status,
          tenantId: input.tenantId,
          termMonths: row.termMonths,
        },
      })

      if (row.firstRepaymentDueAt) {
        const repaymentSchedule = buildRepaymentSchedule({
          monthlyRepaymentAmount: row.monthlyRepaymentAmount,
          principalAmount: row.principalAmount,
          startDate: row.firstRepaymentDueAt,
          termMonths: row.termMonths,
        })
        const repaidAmount = Math.max(
          0,
          row.principalAmount - row.outstandingPrincipal
        )
        let remainingPaid = repaidAmount

        await tx.repaymentScheduleItem.createMany({
          data: repaymentSchedule.map((item) => {
            const applied = Math.min(remainingPaid, item.totalDue)
            remainingPaid -= applied

            return {
              amountPaid: applied,
              chargeDue: item.chargeDue,
              dueAt: item.dueAt,
              installmentNumber: item.installmentNumber,
              loanId: loan.id,
              principalDue: item.principalDue,
              status:
                applied >= item.totalDue
                  ? "paid"
                  : applied > 0
                    ? "partially_paid"
                    : item.status,
              tenantId: input.tenantId,
              totalDue: item.totalDue,
            }
          }),
        })
      }
    })

    processed += 1
  }

  await createAuditLogEntry(
    {
      action: "import.loans",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityType: "Loan",
      metadata: { processed },
      tenantId: input.tenantId,
    },
    prisma
  )

  return { processed }
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

  let processed = 0

  for (const row of input.rows) {
    const loan = await prisma.loan.findFirst({
      where: {
        tenantId: input.tenantId,
        member: { memberNumber: row.memberNumber },
        loanProduct: { name: row.loanProductName },
      },
      include: {
        loanProduct: true,
        member: true,
      },
      orderBy: { createdAt: "desc" },
    })

    if (!loan) {
      throw new Error(
        `Loan not found for repayment import: ${row.memberNumber} / ${row.loanProductName}`
      )
    }

    await postRepayment(
      {
        actorUserId: input.actorUserId,
        amount: row.amount,
        loanId: loan.id,
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
