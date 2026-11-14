import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  createSignedSessionToken,
  platformSessionScope,
} from "@halaalvest/auth"
import { createPrismaClient } from "@halaalvest/db"

import { buildRequestContext } from "../context"
import { createCallerFactory } from "../lib.trpc"
import { appRouter } from "./_app"

/**
 * Spreadsheet imports end to end through the API: who may read and add them,
 * that a file posts once, and that the same file (or the same batch) is never
 * posted twice, even when two requests race.
 */
const prisma = createPrismaClient()
const runIntegration = prisma ? describe : describe.skip
const slug = `imports-${crypto.randomUUID().slice(0, 8)}`
const createCaller = createCallerFactory(appRouter)

type Identity = { membershipId: string; tenantId: string; userId: string }

const membersCsv = [
  "memberNumber,fullName,memberType,joinedAt,status,openingSavingsBalance,monthlyCommitment,deductionSourceName",
  "IMP-0001,Amina Bello,individual,2025-02-01,active,0,10000,Imports Payroll",
  "IMP-0002,Musa Ali,individual,2025-02-01,active,0,,",
].join("\n")

const contributionsCsv = [
  "memberNumber,amount,channel,postedAt,periodLabel,reference",
  "IMP-0001,10000,payroll,2025-03-01,March 2025,",
  "IMP-0001,10000,payroll,2025-04-01,April 2025,",
  "IMP-0002,5000,cash,2025-03-01,March 2025,",
].join("\n")

function fields(entries: Record<string, string>) {
  return { fields: Object.entries(entries) as Array<[string, string]> }
}

runIntegration("import actions", () => {
  let tenantId = ""
  let admin: Identity
  let operations: Identity
  let member: Identity

  async function callerFor(identity: Identity) {
    const token = await createSignedSessionToken({
      ...identity,
      scope: platformSessionScope,
    })
    return createCaller(
      await buildRequestContext(
        new Headers({
          authorization: `Bearer ${token}`,
          host: "api.halaalvest.localhost",
        })
      )
    )
  }

  async function addIdentity(
    role: "tenant_admin" | "operations_officer" | "member"
  ): Promise<Identity> {
    if (!prisma) throw new Error("Database integration test not configured.")
    const user = await prisma.user.create({
      data: {
        email: `${slug}-${role}@example.test`,
        fullName: `Imports ${role}`,
        tenantId,
      },
    })
    const membership = await prisma.membership.create({
      data: { isDefault: true, role, tenantId, userId: user.id },
    })
    return { membershipId: membership.id, tenantId, userId: user.id }
  }

  async function savingsOf(memberNumber: string) {
    const row = await prisma!.member.findFirstOrThrow({
      select: { totalSavingsSnapshot: true },
      where: { memberNumber, tenantId },
    })
    return Number(row.totalSavingsSnapshot)
  }

  beforeAll(async () => {
    if (!prisma) return
    const tenant = await prisma.tenant.create({
      data: {
        initialMigrationStatus: "historical_setup_in_progress",
        name: "Imports Test Cooperative",
        slug,
        startDate: new Date("2025-01-01T00:00:00.000Z"),
        status: "active",
      },
    })
    tenantId = tenant.id
    await prisma.tenantPolicy.create({
      data: {
        migrationSetupConfirmedAt: new Date(),
        migrationSetupMode: "brought_forward",
        tenantId,
      },
    })
    const charge = await prisma.chargeDefinition.create({
      data: {
        amount: 500,
        code: "MONTHLY-LEVY",
        isMonthlyLevy: true,
        kind: "fixed",
        name: "Monthly levy",
        tenantId,
      },
    })
    await prisma.chargeDefinitionVersion.create({
      data: {
        amount: 500,
        chargeDefinitionId: charge.id,
        effectiveFrom: new Date("2025-01-01T00:00:00.000Z"),
        kind: "fixed",
        tenantId,
      },
    })
    ;[admin, operations, member] = await Promise.all([
      addIdentity("tenant_admin"),
      addIdentity("operations_officer"),
      addIdentity("member"),
    ])
  })

  afterAll(async () => {
    if (!prisma) return
    if (tenantId) {
      // Import batches and ledger entries restrict deleting their user and
      // account rows, so they go first.
      await prisma.importBatch.deleteMany({ where: { tenantId } })
      await prisma.ledgerEntry.deleteMany({ where: { tenantId } })
      await prisma.tenant.delete({ where: { id: tenantId } })
    }
    await prisma.$disconnect()
  })

  test("members cannot read import batches or add files", async () => {
    const caller = await callerFor(member)

    await expect(caller.imports.batches({})).rejects.toMatchObject({
      code: "FORBIDDEN",
    })
    await expect(
      caller.imports.batch({ batchId: crypto.randomUUID() })
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
    await expect(caller.imports.referenceData()).rejects.toMatchObject({
      code: "FORBIDDEN",
    })
    await expect(
      caller.dashboardActions.importFileAction(
        fields({ csvText: membersCsv, importKind: "members" })
      )
    ).rejects.toThrow("You do not have access")
  })

  test("staff outside finance cannot add charges", async () => {
    const caller = await callerFor(operations)

    await expect(
      caller.dashboardActions.importFileAction(
        fields({
          csvText:
            "memberNumber,code,name,kind,amount,assessedAt\nIMP-0001,REG,Registration,fixed,1000,2025-03-01",
          importKind: "charges",
        })
      )
    ).rejects.toThrow("You do not have access")
  })

  test("adds members, then posts savings once and refuses the same file again", async () => {
    const caller = await callerFor(admin)

    const membersAdded = await caller.dashboardActions.importFileAction(
      fields({ csvText: membersCsv, importKind: "members" })
    )
    expect(membersAdded.data).toMatchObject({ processed: 2 })

    const added = (
      await caller.dashboardActions.importFileAction(
        fields({ csvText: contributionsCsv, importKind: "contributions" })
      )
    ).data
    expect(added).toMatchObject({ processed: 3 })
    expect(await savingsOf("IMP-0001")).toBe(20000)
    expect(await savingsOf("IMP-0002")).toBe(5000)

    const batch = await caller.imports.batch({ batchId: added.batchId })
    expect(batch).toMatchObject({ status: "applied", totalAmount: 25000 })
    expect(batch).not.toHaveProperty("sourceCsv")

    // The same file again, with different spacing and header case.
    const resent = contributionsCsv
      .replace("memberNumber", "MemberNumber")
      .replaceAll(",", " , ")
    await expect(
      caller.dashboardActions.importFileAction(
        fields({ csvText: resent, importKind: "contributions" })
      )
    ).rejects.toThrow("already been added")
    expect(await savingsOf("IMP-0001")).toBe(20000)

    const ledgerRows = await prisma!.ledgerTransaction.count({
      where: { tenantId, transactionType: "contribution" },
    })
    expect(ledgerRows).toBe(3)
  })

  test("two requests adding the same new file post it once", async () => {
    const caller = await callerFor(admin)
    const csvText = [
      "memberNumber,amount,channel,postedAt,periodLabel,reference",
      "IMP-0002,7000,cash,2025-05-01,May 2025,RACE-1",
    ].join("\n")

    const results = await Promise.allSettled([
      caller.dashboardActions.importFileAction(
        fields({ csvText, importKind: "contributions" })
      ),
      caller.dashboardActions.importFileAction(
        fields({ csvText, importKind: "contributions" })
      ),
    ])

    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(
      1
    )
    expect(await savingsOf("IMP-0002")).toBe(12000)
  })

  test("a saved batch is added once when two people press Add", async () => {
    const caller = await callerFor(admin)
    const staged = (
      await caller.dashboardActions.stageImportBatchAction(
        fields({
          csvText: [
            "memberNumber,amount,channel,postedAt,periodLabel,reference",
            "IMP-0001,3000,cash,2025-06-01,June 2025,STAGED-1",
          ].join("\n"),
          importKind: "contributions",
        })
      )
    ).data

    const results = await Promise.allSettled([
      caller.dashboardActions.applyImportBatchAction(
        fields({ batchId: staged.batchId })
      ),
      caller.dashboardActions.applyImportBatchAction(
        fields({ batchId: staged.batchId })
      ),
    ])

    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(
      1
    )
    expect(await savingsOf("IMP-0001")).toBe(23000)
  })

  test("adds charges and loans from saved rows, once", async () => {
    const caller = await callerFor(admin)
    const chargesCsv = [
      "memberNumber,code,name,kind,amount,assessedAt,notes",
      "IMP-0001,REG-FEE,Registration fee,fixed,2000,2025-02-01,Joining",
    ].join("\n")

    await expect(
      caller.dashboardActions.importFileAction(
        fields({ csvText: chargesCsv, importKind: "charges" })
      )
    ).resolves.toMatchObject({ data: { processed: 1 } })
    expect(await savingsOf("IMP-0001")).toBe(21000)

    // The same charge in a different file is refused by the row check.
    await expect(
      caller.dashboardActions.importFileAction(
        fields({
          csvText: `${chargesCsv}\n`.replace("Joining", "Again"),
          importKind: "charges",
        })
      )
    ).rejects.toThrow("already in Halaalvest")

    await expect(
      caller.dashboardActions.importFileAction(
        fields({
          csvText: [
            "memberNumber,loanProductName,loanType,principalAmount,outstandingPrincipal,termMonths,monthly_repayment_pay,requestedAt,status,disbursedAt,firstRepaymentDueAt",
            "IMP-0002,Standard Loan,normal,120000,80000,12,10000,2025-03-01,active,2025-03-03,2025-04-03",
          ].join("\n"),
          importKind: "loan_migrations",
        })
      )
    ).resolves.toMatchObject({ data: { processed: 1 } })
    const schedule = await prisma!.repaymentScheduleItem.count({
      where: { loan: { member: { memberNumber: "IMP-0002" } }, tenantId },
    })
    expect(schedule).toBe(12)
  })

  test("a file with an unknown member adds nothing", async () => {
    const caller = await callerFor(admin)

    await expect(
      caller.dashboardActions.importFileAction(
        fields({
          csvText: [
            "memberNumber,amount,channel,postedAt,periodLabel,reference",
            "IMP-0001,1000,cash,2025-07-01,July 2025,PART-1",
            "IMP-9999,1000,cash,2025-07-01,July 2025,PART-2",
          ].join("\n"),
          importKind: "contributions",
        })
      )
    ).rejects.toThrow("IMP-9999")
    expect(await savingsOf("IMP-0001")).toBe(21000)
  })
})
