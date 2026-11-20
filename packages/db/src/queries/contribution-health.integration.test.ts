import { afterAll, describe, expect, test } from "bun:test"
import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { readMonthlyRecordCollection } from "./contribution-health"
import { getOverviewSummary } from "./dashboard"

const db = createPrismaClient()
const run =
  db && process.env.RUN_LOCAL_DB_INTEGRATION === "1" ? describe : describe.skip
const rollback = new Error("rollback contribution health fixtures")

run("overview contribution health in PostgreSQL", () => {
  afterAll(async () => {
    await db?.$disconnect()
  })

  test("selects the correct tenant and period and preserves collection rules and fallbacks", async () => {
    const now = new Date()
    const year = now.getUTCFullYear()
    const month = now.getUTCMonth() + 1
    const monthStart = new Date(Date.UTC(year, month - 1, 1))
    const slug = `test-overview-collection-${crypto.randomUUID()}`

    try {
      await db!.$transaction(
        async (tx) => {
          const client = tx as PrismaClient
          const tenant = await tx.tenant.create({
            data: { name: "Overview Collection Test", slug },
          })
          const otherTenant = await tx.tenant.create({
            data: { name: "Other Overview Test", slug: `${slug}-other` },
          })
          const tenantId = tenant.id
          const makeMember = (index: number, owner = tenantId) =>
            tx.member.create({
              data: {
                fullName: `Test Member ${index}`,
                joinedAt: monthStart,
                memberNumber: String(index),
                memberType: "individual",
                status: "active",
                tenantId: owner,
              },
            })
          const [
            applied,
            cancelled,
            pendingPositive,
            pendingZero,
            appliedNegative,
          ] = await Promise.all(
            [0, 1, 2, 3, 4].map((index) => makeMember(index))
          )
          const readHealth = async () =>
            (
              await getOverviewSummary(tenantId, client, {
                queueRows: "open-items",
              })
            ).contributionHealth

          await tx.contributionPlan.createMany({
            data: [applied, pendingZero].map((member) => ({
              amount: "10.05",
              memberId: member.id,
              name: "Monthly",
              startsAt: monthStart,
              tenantId,
            })),
          })
          await tx.contribution.create({
            data: {
              amount: "10.02",
              channel: "transfer",
              memberId: applied.id,
              postedAt: monthStart,
              tenantId,
            },
          })
          const fallback = {
            basis: "active_commitments",
            collectionGap: 10.08,
            expectedThisMonth: 20.1,
            paidMemberCount: 1,
            receivedThisMonth: 10.02,
            state: "gap",
            unpaidMemberCount: 1,
          }
          const makeRecord = (
            periodYear: number,
            periodLabel: string,
            status: "closed" | "draft" | "open",
            owner = tenantId
          ) =>
            tx.monthlyRecord.create({
              data: {
                createdByUserId: crypto.randomUUID(),
                periodLabel,
                periodMonth: month,
                periodYear,
                status,
                tenantId: owner,
              },
            })
          await makeRecord(year, "Other tenant current", "open", otherTenant.id)
          await makeRecord(year - 1, "Closed prior period", "closed")
          expect(await readHealth()).toMatchObject({
            ...fallback,
            periodLabel: new Intl.DateTimeFormat("en", {
              month: "long",
              timeZone: "UTC",
              year: "numeric",
            }).format(monthStart),
          })

          const current = await makeRecord(
            year,
            "Current closed record",
            "closed"
          )
          const latest = await makeRecord(
            year + 2,
            "Latest draft record",
            "draft"
          )
          await makeRecord(year + 1, "Newer open record", "open")
          expect(await readHealth()).toMatchObject({
            ...fallback,
            periodLabel: current.periodLabel,
          })

          await tx.monthlyRecordMember.createMany({
            data: (
              [
                {
                  memberId: applied.id,
                  status: "applied",
                  calculatedPayableAmount: "123456789012.23",
                  totalPaidAmount: "123456789012.22",
                },
                {
                  memberId: cancelled.id,
                  status: "cancelled",
                  calculatedPayableAmount: "0.04",
                  totalPaidAmount: "0.01",
                },
                {
                  memberId: pendingPositive.id,
                  status: "pending",
                  calculatedPayableAmount: "0.05",
                  totalPaidAmount: "0.07",
                },
                {
                  memberId: pendingZero.id,
                  status: "pending",
                  calculatedPayableAmount: "0.03",
                  totalPaidAmount: 0,
                },
                {
                  memberId: appliedNegative.id,
                  status: "applied",
                  calculatedPayableAmount: "0.01",
                  totalPaidAmount: "-0.01",
                },
              ] as const
            ).map((row) => ({
              ...row,
              monthlyRecordId: current.id,
              tenantId,
            })),
          })
          const foreignMember = await makeMember(0, otherTenant.id)
          await tx.monthlyRecordMember.create({
            data: {
              calculatedPayableAmount: "9999.00",
              memberId: foreignMember.id,
              monthlyRecordId: current.id,
              tenantId: otherTenant.id,
            },
          })
          expect(await readHealth()).toEqual({
            basis: "monthly_record",
            collectionGap: 0.07,
            expectedThisMonth: 123456789012.36,
            paidMemberCount: 1,
            periodLabel: current.periodLabel,
            receivedThisMonth: 123456789012.29,
            state: "gap",
            unpaidMemberCount: 2,
          })

          const reference = new Proxy(client, {
            get: (target, key) =>
              key === "$queryRaw" ? undefined : Reflect.get(target, key),
          })
          expect(
            await readMonthlyRecordCollection(tenantId, { month, year }, client)
          ).toEqual(
            await readMonthlyRecordCollection(
              tenantId,
              { month, year },
              reference
            )
          )

          await tx.monthlyRecord.delete({ where: { id: current.id } })
          expect(await readHealth()).toMatchObject({
            ...fallback,
            periodLabel: latest.periodLabel,
          })

          await tx.monthlyRecordMember.create({
            data: {
              calculatedPayableAmount: "0.03",
              memberId: applied.id,
              monthlyRecordId: latest.id,
              status: "applied",
              tenantId,
              totalPaidAmount: "0.03",
            },
          })
          expect(await readHealth()).toEqual({
            basis: "monthly_record",
            collectionGap: 0,
            expectedThisMonth: 0.03,
            paidMemberCount: 1,
            periodLabel: latest.periodLabel,
            receivedThisMonth: 0.03,
            state: "covered",
            unpaidMemberCount: 0,
          })

          throw rollback
        },
        { timeout: 20_000 }
      )
    } catch (error) {
      if (error !== rollback) throw error
    }
  })
})
