import type { PrismaClient } from "@prisma/client"
import { allocateBusinessProfitByShare } from "@halaalvest/domain"
import { createPrismaClient } from "../prisma"
import { getTenantInitialMigrationState } from "./migration"
import { getTenantById } from "./tenants"

async function assertHistoricalFinanceSetupMutationOpen(
  tenantId: string,
  prisma: PrismaClient,
) {
  const migrationState = await getTenantInitialMigrationState(tenantId, prisma)

  if (!migrationState.snapshot.canUseMigrationTools) {
    throw new Error(
      "Historical finance setup is locked because initial migration is finalized.",
    )
  }

  if (
    migrationState.counts.appliedBackfillBatches > 0 ||
    migrationState.counts.appliedBackfillMembers > 0 ||
    migrationState.counts.appliedBackfillMonths > 0
  ) {
    throw new Error(
      "Historical finance setup is locked because member ledger backfill has already started.",
    )
  }
}

async function assertLiveFinancialWritesOpen(
  tenantId: string,
  prisma: PrismaClient,
) {
  const migrationState = await getTenantInitialMigrationState(tenantId, prisma)

  if (!migrationState.snapshot.canUseLiveFinancialWrites) {
    throw new Error(
      "Live financial record writes are locked until initial migration is finalized.",
    )
  }
}

export async function getTenantFinanceSetup(
  tenantId: string,
  prismaOverride?: PrismaClient,
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any

  if (!prisma) {
    const tenant = getTenantById(tenantId)
    return {
      chargeDefinitions: [],
      dividendPeriods: [],
      shareBusinesses: [],
      shareStructureVersions: [],
      tenant,
    }
  }

  const [tenant, shareStructureVersions, chargeDefinitions, shareBusinesses, dividendPeriods] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        startDate: true,
        currencyCode: true,
      },
    }),
    prisma.tenantShareStructureVersion.findMany({
      where: { tenantId },
      orderBy: { effectiveFrom: "asc" },
    }),
    prisma.chargeDefinition.findMany({
      where: { tenantId },
      include: {
        versions: {
          orderBy: { effectiveFrom: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.shareBusiness.findMany({
      where: { tenantId },
      include: {
        linkedDividendPeriod: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        profitEntries: {
          include: {
            allocations: true,
            linkedDividendPeriod: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
          orderBy: [{ profitDate: "desc" }, { createdAt: "desc" }],
        },
      },
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    }),
    prisma.dividendPeriod.findMany({
      where: { tenantId },
      orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }],
      take: 12,
    }),
  ])

  return {
    chargeDefinitions,
    dividendPeriods,
    shareBusinesses,
    shareStructureVersions,
    tenant,
  }
}

export async function listTenantShareStructureVersions(
  tenantId: string,
  prismaOverride?: PrismaClient,
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) return []

  return prisma.tenantShareStructureVersion.findMany({
    where: { tenantId },
    orderBy: { effectiveFrom: "asc" },
  })
}

export async function createTenantShareStructureVersion(
  input: {
    tenantId: string
    effectiveFrom: Date
    amount: number
    basis?: "after_charge_deductions"
    notes?: string
    valueType?: "fixed_amount" | "percentage"
    createdByUserId?: string
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  await assertHistoricalFinanceSetupMutationOpen(input.tenantId, prisma)

  return prisma.tenantShareStructureVersion.create({
    data: {
      tenantId: input.tenantId,
      effectiveFrom: input.effectiveFrom,
      amount: input.amount,
      basis: input.basis ?? "after_charge_deductions",
      notes: input.notes,
      valueType: input.valueType ?? "fixed_amount",
      createdByUserId: input.createdByUserId,
    },
  })
}

export async function updateTenantShareStructureVersion(
  input: {
    tenantId: string
    shareStructureVersionId: string
    effectiveFrom: Date
    amount: number
    basis?: "after_charge_deductions"
    notes?: string
    valueType?: "fixed_amount" | "percentage"
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  await assertHistoricalFinanceSetupMutationOpen(input.tenantId, prisma)

  const existing = await prisma.tenantShareStructureVersion.findFirst({
    where: {
      id: input.shareStructureVersionId,
      tenantId: input.tenantId,
    },
  })

  if (!existing) {
    throw new Error("Share structure version not found")
  }

  return prisma.tenantShareStructureVersion.update({
    where: {
      id: input.shareStructureVersionId,
      tenantId: input.tenantId,
    },
    data: {
      amount: input.amount,
      basis: input.basis ?? existing.basis ?? "after_charge_deductions",
      effectiveFrom: input.effectiveFrom,
      notes: input.notes ?? null,
      valueType: input.valueType ?? existing.valueType ?? "fixed_amount",
    },
  })
}

export async function listChargeDefinitionVersions(
  tenantId: string,
  chargeDefinitionId: string,
  prismaOverride?: PrismaClient,
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) return []

  return prisma.chargeDefinitionVersion.findMany({
    where: {
      tenantId,
      chargeDefinitionId,
    },
    orderBy: { effectiveFrom: "asc" },
  })
}

export async function createChargeDefinitionVersion(
  input: {
    tenantId: string
    chargeDefinitionId: string
    effectiveFrom: Date
    amount: number
    kind: "fixed" | "percentage"
    chargeValueType?: "fixed_amount" | "percentage"
    notes?: string
    createdByUserId?: string
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  await assertHistoricalFinanceSetupMutationOpen(input.tenantId, prisma)

  return prisma.$transaction(async (tx: any) => {
    const version = await tx.chargeDefinitionVersion.create({
      data: {
        tenantId: input.tenantId,
        chargeDefinitionId: input.chargeDefinitionId,
        effectiveFrom: input.effectiveFrom,
        amount: input.amount,
        kind: input.kind,
        chargeValueType: input.chargeValueType ?? (input.kind === "percentage" ? "percentage" : "fixed_amount"),
        notes: input.notes,
        createdByUserId: input.createdByUserId,
      },
    })

    const latestVersion = await tx.chargeDefinitionVersion.findFirst({
      where: {
        tenantId: input.tenantId,
        chargeDefinitionId: input.chargeDefinitionId,
        effectiveFrom: {
          lte: new Date(),
        },
      },
      orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
    })

    if (latestVersion) {
      await tx.chargeDefinition.update({
        where: {
          id: input.chargeDefinitionId,
          tenantId: input.tenantId,
        },
        data: {
          amount: latestVersion.amount,
          kind: latestVersion.kind,
          chargeValueType: latestVersion.chargeValueType,
        },
      })
    }

    return version
  })
}

export async function updateChargeDefinitionVersion(
  input: {
    tenantId: string
    chargeDefinitionVersionId: string
    effectiveFrom: Date
    amount: number
    chargeValueType?: "fixed_amount" | "percentage"
    notes?: string
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  await assertHistoricalFinanceSetupMutationOpen(input.tenantId, prisma)

  return prisma.$transaction(async (tx: any) => {
    const existing = await tx.chargeDefinitionVersion.findFirst({
      where: {
        id: input.chargeDefinitionVersionId,
        tenantId: input.tenantId,
      },
    })

    if (!existing) {
      throw new Error("Charge version not found")
    }

    const chargeValueType =
      input.chargeValueType ??
      existing.chargeValueType ??
      (existing.kind === "percentage" ? "percentage" : "fixed_amount")
    const kind = chargeValueType === "percentage" ? "percentage" : "fixed"
    const version = await tx.chargeDefinitionVersion.update({
      where: {
        id: input.chargeDefinitionVersionId,
        tenantId: input.tenantId,
      },
      data: {
        amount: input.amount,
        chargeValueType,
        effectiveFrom: input.effectiveFrom,
        kind,
        notes: input.notes ?? null,
      },
    })

    const latestVersion = await tx.chargeDefinitionVersion.findFirst({
      where: {
        tenantId: input.tenantId,
        chargeDefinitionId: existing.chargeDefinitionId,
        effectiveFrom: {
          lte: new Date(),
        },
      },
      orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
    })

    if (latestVersion) {
      await tx.chargeDefinition.update({
        where: {
          id: existing.chargeDefinitionId,
          tenantId: input.tenantId,
        },
        data: {
          amount: latestVersion.amount,
          chargeValueType: latestVersion.chargeValueType,
          kind: latestVersion.kind,
        },
      })
    }

    return version
  })
}

export async function listShareBusinesses(
  tenantId: string,
  prismaOverride?: PrismaClient,
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) return []

  return prisma.shareBusiness.findMany({
    where: { tenantId },
    include: {
      linkedDividendPeriod: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
      profitEntries: {
        include: {
          allocations: true,
          linkedDividendPeriod: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
        orderBy: [{ profitDate: "desc" }, { createdAt: "desc" }],
      },
    },
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
  })
}

export async function createShareBusiness(
  input: {
    tenantId: string
    name: string
    capitalAmount: number
    profitAmount: number
    startDate: Date
    endDate?: Date
    status?: "planned" | "active" | "completed" | "archived"
    notes?: string
    linkedDividendPeriodId?: string
    createdByUserId?: string
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  await assertHistoricalFinanceSetupMutationOpen(input.tenantId, prisma)

  return prisma.$transaction(async (tx: any) => {
    const business = await tx.shareBusiness.create({
      data: {
        tenantId: input.tenantId,
        name: input.name,
        capitalAmount: input.capitalAmount,
        profitAmount: input.profitAmount,
        startDate: input.startDate,
        endDate: input.endDate,
        status: input.status ?? "planned",
        notes: input.notes,
        linkedDividendPeriodId: input.linkedDividendPeriodId,
        createdByUserId: input.createdByUserId,
      },
    })

    if (input.profitAmount > 0) {
      await tx.shareBusinessProfitEntry.create({
        data: {
          tenantId: input.tenantId,
          shareBusinessId: business.id,
          linkedDividendPeriodId: input.linkedDividendPeriodId,
          profitAmount: input.profitAmount,
          expenseAmount: 0,
          allocatableProfitAmount: input.profitAmount,
          profitDate: input.endDate ?? input.startDate,
          notes: input.notes,
          reason: input.notes,
          status: input.status === "completed" ? "reviewed" : "draft",
          sourceType: "manual",
          createdByUserId: input.createdByUserId,
        },
      })
    }

    return tx.shareBusiness.findFirst({
      where: { id: business.id, tenantId: input.tenantId },
      include: {
        profitEntries: {
          include: {
            allocations: true,
          },
          orderBy: [{ profitDate: "desc" }, { createdAt: "desc" }],
        },
      },
    })
  })
}

export async function updateShareBusiness(
  input: {
    tenantId: string
    shareBusinessId: string
    name: string
    capitalAmount: number
    profitAmount: number
    startDate: Date
    endDate?: Date | null
    status?: "planned" | "active" | "completed" | "archived"
    notes?: string
    linkedDividendPeriodId?: string | null
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  await assertHistoricalFinanceSetupMutationOpen(input.tenantId, prisma)

  const existing = await prisma.shareBusiness.findFirst({
    where: {
      id: input.shareBusinessId,
      tenantId: input.tenantId,
    },
  })

  if (!existing) {
    throw new Error("Share business not found")
  }

  return prisma.shareBusiness.update({
    where: {
      id: input.shareBusinessId,
      tenantId: input.tenantId,
    },
    data: {
      capitalAmount: input.capitalAmount,
      endDate: input.endDate ?? null,
      linkedDividendPeriodId: input.linkedDividendPeriodId ?? null,
      name: input.name,
      notes: input.notes ?? null,
      profitAmount: input.profitAmount,
      startDate: input.startDate,
      status: input.status ?? existing.status,
    },
  })
}

export async function createMemberShareLedgerEntry(
  input: {
    tenantId: string
    memberId: string
    sourceType: "monthly_share_charge" | "backfill" | "manual_adjustment" | "import" | "reversal"
    amount: number
    effectiveDate: Date
    sourceId?: string
    notes?: string
    createdByUserId?: string
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  if (input.sourceType !== "backfill" && input.sourceType !== "import") {
    await assertLiveFinancialWritesOpen(input.tenantId, prisma)
  }

  return prisma.memberShareLedgerEntry.create({
    data: {
      tenantId: input.tenantId,
      memberId: input.memberId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      amount: input.amount,
      effectiveDate: input.effectiveDate,
      notes: input.notes,
      createdByUserId: input.createdByUserId,
    },
  })
}

export async function listMemberShareLedgerEntries(
  input: {
    tenantId: string
    asOfDate?: Date
    memberId?: string
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) return []

  return prisma.memberShareLedgerEntry.findMany({
    where: {
      tenantId: input.tenantId,
      ...(input.memberId ? { memberId: input.memberId } : {}),
      ...(input.asOfDate ? { effectiveDate: { lte: input.asOfDate } } : {}),
    },
    include: {
      member: {
        select: {
          fullName: true,
          memberNumber: true,
        },
      },
    },
    orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }],
  })
}

export async function getMemberShareBalancesAtDate(
  tenantId: string,
  asOfDate: Date,
  prismaOverride?: PrismaClient,
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) return []

  const entries = await prisma.memberShareLedgerEntry.findMany({
    where: {
      tenantId,
      effectiveDate: {
        lte: asOfDate,
      },
    },
    include: {
      member: {
        select: {
          fullName: true,
          memberNumber: true,
          status: true,
        },
      },
    },
  })
  const balances = new Map<
    string,
    { memberId: string; memberName: string; memberNumber: string; shareBalance: number }
  >()

  for (const entry of entries) {
    const current = balances.get(entry.memberId) ?? {
      memberId: entry.memberId,
      memberName: entry.member.fullName,
      memberNumber: entry.member.memberNumber,
      shareBalance: 0,
    }
    current.shareBalance += Number(entry.amount)
    balances.set(entry.memberId, current)
  }

  return Array.from(balances.values())
    .filter((balance) => balance.shareBalance > 0)
    .sort((a, b) => b.shareBalance - a.shareBalance || a.memberName.localeCompare(b.memberName))
}

export async function getSharePoolSummary(
  tenantId: string,
  asOfDate = new Date(),
  prismaOverride?: PrismaClient,
) {
  const balances = await getMemberShareBalancesAtDate(tenantId, asOfDate, prismaOverride)
  const totalShareBalance = balances.reduce((total, balance) => total + balance.shareBalance, 0)

  return {
    asOfDate,
    memberCount: balances.length,
    topMembers: balances.slice(0, 5).map((balance) => ({
      ...balance,
      sharePercentage: totalShareBalance > 0 ? balance.shareBalance / totalShareBalance : 0,
    })),
    totalShareBalance,
  }
}

export async function createShareBusinessProfitEntry(
  input: {
    tenantId: string
    shareBusinessId: string
    profitAmount: number
    expenseAmount?: number
    allocatableProfitAmount?: number
    profitDate: Date
    reason?: string
    status?: "draft" | "reviewed" | "approved" | "archived"
    sourceType?: "manual" | "backfill" | "import"
    linkedDividendPeriodId?: string
    notes?: string
    createdByUserId?: string
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  await assertHistoricalFinanceSetupMutationOpen(input.tenantId, prisma)
  const expenseAmount = input.expenseAmount ?? 0
  const allocatableProfitAmount =
    input.allocatableProfitAmount ?? Math.max(0, input.profitAmount - expenseAmount)

  if (expenseAmount < 0) {
    throw new Error("Expense amount cannot be negative.")
  }

  if (allocatableProfitAmount < 0 || allocatableProfitAmount > input.profitAmount) {
    throw new Error("Allocatable profit must be between zero and the recorded profit amount.")
  }

  return prisma.shareBusinessProfitEntry.create({
    data: {
      tenantId: input.tenantId,
      shareBusinessId: input.shareBusinessId,
      linkedDividendPeriodId: input.linkedDividendPeriodId,
      profitAmount: input.profitAmount,
      expenseAmount,
      allocatableProfitAmount,
      profitDate: input.profitDate,
      reason: input.reason,
      status: input.status ?? "draft",
      sourceType: input.sourceType ?? "manual",
      notes: input.notes,
      createdByUserId: input.createdByUserId,
    },
  })
}

export async function updateShareBusinessProfitEntry(
  input: {
    tenantId: string
    profitEntryId: string
    profitAmount: number
    expenseAmount?: number
    allocatableProfitAmount?: number
    profitDate: Date
    reason?: string
    status?: "draft" | "reviewed" | "approved" | "archived"
    sourceType?: "manual" | "backfill" | "import"
    linkedDividendPeriodId?: string | null
    notes?: string
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  await assertHistoricalFinanceSetupMutationOpen(input.tenantId, prisma)
  const expenseAmount = input.expenseAmount ?? 0
  const allocatableProfitAmount =
    input.allocatableProfitAmount ?? Math.max(0, input.profitAmount - expenseAmount)

  if (expenseAmount < 0) {
    throw new Error("Expense amount cannot be negative.")
  }

  if (allocatableProfitAmount < 0 || allocatableProfitAmount > input.profitAmount) {
    throw new Error("Allocatable profit must be between zero and the recorded profit amount.")
  }

  return prisma.$transaction(async (tx: any) => {
    const existing = await tx.shareBusinessProfitEntry.findFirst({
      where: {
        id: input.profitEntryId,
        tenantId: input.tenantId,
      },
      include: {
        allocations: {
          select: { status: true },
        },
      },
    })

    if (!existing) {
      throw new Error("Business profit entry not found")
    }

    if (existing.allocations.some((allocation: { status: string }) => allocation.status === "published")) {
      throw new Error("Published profit allocations cannot be edited.")
    }

    await tx.shareProfitAllocation.deleteMany({
      where: {
        tenantId: input.tenantId,
        profitEntryId: input.profitEntryId,
        status: "draft",
      },
    })

    return tx.shareBusinessProfitEntry.update({
      where: {
        id: input.profitEntryId,
        tenantId: input.tenantId,
      },
      data: {
        allocatableProfitAmount,
        expenseAmount,
        linkedDividendPeriodId: input.linkedDividendPeriodId ?? null,
        notes: input.notes ?? null,
        profitAmount: input.profitAmount,
        profitDate: input.profitDate,
        reason: input.reason ?? null,
        sourceType: input.sourceType ?? existing.sourceType,
        status: input.status ?? existing.status,
      },
    })
  })
}

export async function generateShareProfitAllocations(
  input: {
    tenantId: string
    profitEntryId: string
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  await assertHistoricalFinanceSetupMutationOpen(input.tenantId, prisma)

  return prisma.$transaction(async (tx: any) => {
    const profitEntry = await tx.shareBusinessProfitEntry.findFirst({
      where: {
        id: input.profitEntryId,
        tenantId: input.tenantId,
      },
    })

    if (!profitEntry) throw new Error("Business profit entry not found")

    const balances = await getMemberShareBalancesAtDate(
      input.tenantId,
      profitEntry.profitDate,
      tx as PrismaClient,
    )
    const totalShareBalance = balances.reduce((total, balance) => total + balance.shareBalance, 0)

    if (totalShareBalance <= 0) {
      throw new Error("No member share balances exist on this profit date.")
    }

    const allocations = allocateBusinessProfitByShare({
      profitAmount: Number(profitEntry.allocatableProfitAmount ?? profitEntry.profitAmount),
      balances,
    })

    await tx.shareProfitAllocation.deleteMany({
      where: {
        tenantId: input.tenantId,
        profitEntryId: input.profitEntryId,
        status: "draft",
      },
    })

    await tx.shareProfitAllocation.createMany({
      data: allocations.map((allocation: {
        allocatedProfitAmount: number
        memberId: string
        shareBalance: number
        sharePercentage: number
      }) => ({
        tenantId: input.tenantId,
        memberId: allocation.memberId,
        profitEntryId: input.profitEntryId,
        memberShareBalance: allocation.shareBalance,
        totalShareBalance,
        sharePercentage: allocation.sharePercentage,
        allocatedProfitAmount: allocation.allocatedProfitAmount,
        status: "draft",
      })),
    })

    return tx.shareProfitAllocation.findMany({
      where: {
        tenantId: input.tenantId,
        profitEntryId: input.profitEntryId,
      },
      include: {
        member: {
          select: {
            fullName: true,
            memberNumber: true,
          },
        },
      },
      orderBy: { allocatedProfitAmount: "desc" },
    })
  })
}

export async function publishShareProfitAllocations(
  input: {
    tenantId: string
    profitEntryId: string
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  await assertHistoricalFinanceSetupMutationOpen(input.tenantId, prisma)

  return prisma.$transaction(async (tx: any) => {
    const profitEntry = await tx.shareBusinessProfitEntry.findFirst({
      where: {
        id: input.profitEntryId,
        tenantId: input.tenantId,
      },
      include: {
        allocations: true,
      },
    })

    if (!profitEntry) throw new Error("Business profit entry not found")
    if (!profitEntry.linkedDividendPeriodId) {
      throw new Error("Link this profit entry to a dividend period before publishing.")
    }
    if (profitEntry.allocations.length === 0) {
      throw new Error("Generate share profit allocations before publishing.")
    }

    await tx.shareProfitAllocation.updateMany({
      where: {
        tenantId: input.tenantId,
        profitEntryId: input.profitEntryId,
        status: "draft",
      },
      data: {
        status: "published",
      },
    })

    for (const allocation of profitEntry.allocations) {
      await tx.dividendAllocation.upsert({
        where: {
          dividendPeriodId_memberId: {
            dividendPeriodId: profitEntry.linkedDividendPeriodId,
            memberId: allocation.memberId,
          },
        },
        update: {
          savingsBasisAmount: allocation.memberShareBalance,
          allocationAmount: allocation.allocatedProfitAmount,
        },
        create: {
          tenantId: input.tenantId,
          dividendPeriodId: profitEntry.linkedDividendPeriodId,
          memberId: allocation.memberId,
          savingsBasisAmount: allocation.memberShareBalance,
          allocationAmount: allocation.allocatedProfitAmount,
        },
      })
    }

    return tx.shareProfitAllocation.findMany({
      where: {
        tenantId: input.tenantId,
        profitEntryId: input.profitEntryId,
      },
      include: {
        member: {
          select: {
            fullName: true,
            memberNumber: true,
          },
        },
      },
      orderBy: { allocatedProfitAmount: "desc" },
    })
  })
}

export async function getResolvedShareAmountForMonth(
  input: {
    tenantId: string
    memberId: string
    month: Date
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) return 0

  const memberOverride = await prisma.memberShareOverride.findFirst({
    where: {
      tenantId: input.tenantId,
      memberId: input.memberId,
      effectiveFrom: {
        lte: input.month,
      },
    },
    orderBy: { effectiveFrom: "desc" },
  })

  if (memberOverride) {
    return Number(memberOverride.amount)
  }

  const tenantDefault = await prisma.tenantShareStructureVersion.findFirst({
    where: {
      tenantId: input.tenantId,
      effectiveFrom: {
        lte: input.month,
      },
    },
    orderBy: { effectiveFrom: "desc" },
  })

  return tenantDefault ? Number(tenantDefault.amount) : 0
}
