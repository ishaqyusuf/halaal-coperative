import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import { createPrismaClient } from "../prisma"
import { ensureTenantLedgerAccounts } from "./ledger"
import {
  choosePlatformBillFundingSource,
  closePlatformBillForTenant,
  getPlatformBill,
  listPlatformBillFundingSources,
  meterPlatformAssistantMessage,
  recordPlatformBillRemittance,
  updatePlatformBillingSettings,
} from "./platform-billing"

/**
 * Month close against local Postgres (RUN_LOCAL_DB_INTEGRATION=1): seat and
 * assistant lines, members-pay seat charges, ledger accrual and payment,
 * idempotent repeat, and the assistant limit. Uses its own tenants only.
 */
const db = createPrismaClient()
const run =
  db && process.env.RUN_LOCAL_DB_INTEGRATION === "1" ? describe : describe.skip
const slug = `billing-it-${crypto.randomUUID().slice(0, 8)}`
const tenants: string[] = []
const period = "2026-10"
const closeAt = new Date("2026-11-01T00:30:00+01:00")
const octoberDay = new Date("2026-10-20T10:00:00+01:00")

async function seedTenant(suffix: string, activeMembers: number) {
  const tenant = await db!.tenant.create({
    data: {
      name: `Billing ${suffix}`,
      slug: `${slug}-${suffix}`,
      status: "active",
      initialMigrationStatus: "live_operations",
      migrationFinalizedAt: new Date("2026-01-31T00:00:00.000Z"),
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  })
  tenants.push(tenant.id)
  await ensureTenantLedgerAccounts(tenant.id, db!)
  const user = await db!.user.create({
    data: {
      email: `${slug}-${suffix}@example.test`,
      fullName: `Billing admin ${suffix}`,
      passwordHash: "test-only",
      tenantId: tenant.id,
      isPlatformOwner: true,
    },
  })
  for (let index = 0; index < activeMembers + 1; index++) {
    await db!.member.create({
      data: {
        tenantId: tenant.id,
        fullName: `Member ${suffix} ${index}`,
        joinedAt: new Date("2026-01-01T00:00:00.000Z"),
        memberNumber: `${slug}-${suffix}-${index}`,
        memberType: "individual",
        // The last one is not a seat.
        status: index < activeMembers ? "active" : "inactive",
      },
    })
  }
  return { tenantId: tenant.id, userId: user.id }
}

async function ledgerBalance(tenantId: string, code: string) {
  const entries = await db!.ledgerEntry.findMany({
    where: { tenantId, ledgerAccount: { code } },
    select: { direction: true, amount: true },
  })
  return entries.reduce(
    (sum, entry) =>
      sum + (entry.direction === "debit" ? 1 : -1) * Number(entry.amount),
    0
  )
}

run("platform billing month close", () => {
  let membersPay = { tenantId: "", userId: "" }
  let coopPays = { tenantId: "", userId: "" }

  beforeAll(async () => {
    membersPay = await seedTenant("members", 3)
    coopPays = await seedTenant("coop", 2)
  })

  afterAll(async () => {
    if (db && tenants.length) {
      const where = { tenantId: { in: tenants } }
      await db.ledgerEntry.deleteMany({ where })
      await db.ledgerTransaction.deleteMany({ where })
      await db.platformBill.deleteMany({ where })
      await db.chargeApplication.deleteMany({ where })
      await db.tenant.deleteMany({ where: { id: { in: tenants } } })
    }
    await db?.$disconnect()
  })

  it("stops assistant messages at the free allowance, then at the cap", async () => {
    const { tenantId } = membersPay
    await db!.platformAssistantUsage.create({
      data: { tenantId, period, messages: 499 },
    })
    const meter = () =>
      db!.$transaction((tx) =>
        meterPlatformAssistantMessage(tx, { tenantId, now: octoberDay })
      )
    expect((await meter()).messages).toBe(500)
    await expect(meter()).rejects.toThrow(/free assistant messages/)

    // Billing on with a ₦30 cap buys two more ₦15 messages.
    await updatePlatformBillingSettings(
      {
        tenantId,
        actorUserId: membersPay.userId,
        seatFeePayer: "members",
        assistantAutoBilling: true,
        assistantMonthlyCap: 30,
      },
      db!
    )
    await Promise.all([meter(), meter()])
    await expect(meter()).rejects.toThrow(/cap/)
    const usage = await db!.platformAssistantUsage.findUniqueOrThrow({
      where: { tenantId_period: { tenantId, period } },
    })
    expect(usage.messages).toBe(502)
    expect(usage.billableMessages).toBe(2)
  })

  it("bills seats and overage, charges members, and posts the accrual once", async () => {
    const { tenantId } = membersPay
    const closed = await closePlatformBillForTenant(
      { tenantId, period, now: closeAt },
      db!
    )
    expect(closed).toMatchObject({ seatCharges: 3, accrued: true })
    expect(
      await closePlatformBillForTenant({ tenantId, period, now: closeAt }, db!)
    ).toBeNull()

    const bill = await getPlatformBill({ tenantId, billId: closed!.billId }, db!)
    expect(bill.status).toBe("issued")
    expect(bill.seatFeePayer).toBe("members")
    expect(bill.lines.map((line) => [line.kind, line.amount])).toEqual([
      ["seat_fee", 105],
      ["ai_overage", 30],
    ])
    expect(bill.totalAmount).toBe(135)
    expect(bill.chargedSeats).toBe(3)

    // Accrual: platform fees 135 Dr / payable 135 Cr. Seat charges: savings
    // 105 Dr / platform fees 105 Cr, so members carry the seat fee.
    expect(await ledgerBalance(tenantId, "5210")).toBe(30)
    expect(await ledgerBalance(tenantId, "2100")).toBe(-135)
    expect(await ledgerBalance(tenantId, "1000")).toBe(105)
  })

  it("records the chosen source on the payment posting", async () => {
    const { tenantId, userId } = membersPay
    const bill = await db!.platformBill.findFirstOrThrow({
      where: { tenantId, period },
    })
    const sources = await listPlatformBillFundingSources(tenantId, db!)
    const seatCharge = sources.find((source) => source.name === "Platform seat fee")
    expect(seatCharge).toMatchObject({ type: "charge", received: 105, paidOut: 0 })

    await choosePlatformBillFundingSource(
      {
        tenantId,
        billId: bill.id,
        actorUserId: userId,
        sourceType: "charge",
        sourceId: seatCharge!.id,
      },
      db!
    )
    const paid = await recordPlatformBillRemittance(
      {
        billId: bill.id,
        reference: `${slug}-transfer`,
        paidAt: "2026-11-02",
        actorUserId: userId,
      },
      db!
    )
    expect(paid.status).toBe("paid")
    expect(await ledgerBalance(tenantId, "2100")).toBe(0)
    const payment = await db!.ledgerTransaction.findFirstOrThrow({
      where: { tenantId, reference: `${slug}-transfer` },
    })
    expect(payment.narration).toContain('paid from charge "Platform seat fee"')
    await expect(
      choosePlatformBillFundingSource(
        {
          tenantId,
          billId: bill.id,
          actorUserId: userId,
          sourceType: "charge",
          sourceId: seatCharge!.id,
        },
        db!
      )
    ).rejects.toThrow(/unpaid bill/)
    const after = await listPlatformBillFundingSources(tenantId, db!)
    expect(after.find((source) => source.id === seatCharge!.id)?.paidOut).toBe(135)
  })

  it("charges no members when the cooperative pays", async () => {
    const { tenantId } = coopPays
    const closed = await closePlatformBillForTenant(
      { tenantId, period, now: closeAt },
      db!
    )
    expect(closed?.seatCharges).toBe(0)
    const bill = await getPlatformBill({ tenantId, billId: closed!.billId }, db!)
    expect(bill.totalAmount).toBe(70)
    expect(await ledgerBalance(tenantId, "5210")).toBe(70)
    expect(await ledgerBalance(tenantId, "1000")).toBe(0)
  })
})
