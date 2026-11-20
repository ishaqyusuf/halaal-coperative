import { describe, expect, it } from "bun:test"
import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import {
  getMemberRegistrySummary,
  listMemberStatementSummaries,
  listMembersTable,
  type MembersTableSortField,
} from "./members"

const db = createPrismaClient()
const run =
  db && process.env.RUN_LOCAL_DB_INTEGRATION === "1" ? describe : describe.skip
const rollback = new Error("rollback")

run("member registry and statement export (local database)", () => {
  it("keeps summary and table filters aligned and pages ties consistently", async () => {
    await db!
      .$transaction(async (tx) => {
        const prisma = tx as PrismaClient
        const now = new Date()
        const current = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
        )
        const prior = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)
        )
        const tenant = await tx.tenant.create({
          data: { name: "Member registry fixture", slug: crypto.randomUUID() },
        })
        const tenantId = tenant.id
        const otherTenant = await tx.tenant.create({
          data: { name: "Other registry fixture", slug: crypto.randomUUID() },
        })
        const user = await tx.user.create({
          data: {
            tenantId,
            email: "migration@example.test",
            fullName: "Fixture user",
          },
        })
        const common = {
          tenantId,
          fullName: "Emma_Example",
          joinedAt: current,
          createdAt: current,
          memberType: "business",
          kycStatus: "verified",
          status: "active",
        } as const
        const empty = {
          activeCount: 0,
          kycPendingCount: 0,
          linkedUsersCount: 0,
          migrationFinalizedCount: 0,
          totalCount: 0,
        }
        expect(
          await getMemberRegistrySummary(tenantId, undefined, prisma)
        ).toEqual(empty)

        const [linked, , historical, broughtForward] =
          await tx.member.createManyAndReturn({
            data: [
              { ...common, memberNumber: "M-01", userId: user.id },
              { ...common, memberNumber: "M-02" },
              {
                ...common,
                memberNumber: "H-03",
                joinedAt: prior,
                kycStatus: "pending",
                status: "suspended",
              },
              { ...common, memberNumber: "B-04", joinedAt: prior },
              { ...common, memberNumber: "OTHER", tenantId: otherTenant.id },
            ],
            select: { id: true },
          })
        await tx.memberOpeningBalance.create({
          data: {
            tenantId,
            memberId: broughtForward.id,
            status: "applied",
            openingDate: current,
          },
        })
        expect(
          await getMemberRegistrySummary(tenantId, undefined, prisma)
        ).toEqual({
          activeCount: 3,
          kycPendingCount: 1,
          linkedUsersCount: 1,
          migrationFinalizedCount: 3,
          totalCount: 4,
        })
        for (const search of ["emma", "m-0", "emma\\_example", "EMMA%"]) {
          const filters = {
            search,
            joinedFrom: current,
            joinedTo: current,
            kycStatus: "verified",
            memberType: "business",
            status: "active",
          } as const
          expect(
            await getMemberRegistrySummary(tenantId, filters, prisma)
          ).toEqual({
            activeCount: 2,
            kycPendingCount: 0,
            linkedUsersCount: 1,
            migrationFinalizedCount: 2,
            totalCount: 2,
          })

          for (const sort of [
            "fullName",
            "joinedAt",
            "kycStatus",
            "memberNumber",
            "memberType",
            "status",
          ] satisfies MembersTableSortField[]) {
            const query = {
              ...filters,
              q: search,
              sort: [sort, "asc"] as [MembersTableSortField, "asc"],
            }
            const original = await listMembersTable(tenantId, query, prisma)
            const pageFilters = {
              ...query,
              migrationStatus: "finalized",
              pageSize: 1,
            } as const
            const first = await listMembersTable(tenantId, pageFilters, prisma)
            const second = await listMembersTable(
              tenantId,
              { ...pageFilters, cursor: first.meta.cursor },
              prisma
            )
            expect(first.meta.cursor).toBe("1")
            expect(second.meta).toEqual({
              cursor: null,
              hasNextPage: false,
              hasPreviousPage: true,
            })
            expect(first.data.concat(second.data).map(({ id }) => id)).toEqual(
              original.data.map(({ id }) => id)
            )
          }
        }

        expect(
          (
            await listMembersTable(
              tenantId,
              { migrationStatus: "pending" },
              prisma
            )
          ).data.map(({ id }) => id)
        ).toEqual([historical.id])
        expect(
          await getMemberRegistrySummary(
            tenantId,
            { migrationStatus: "pending" },
            prisma
          )
        ).toEqual({
          ...empty,
          kycPendingCount: 1,
          totalCount: 1,
        })

        await tx.tenantPolicy.create({
          data: { tenantId, migrationSetupMode: "brought_forward" },
        })
        expect(
          await getMemberRegistrySummary(
            tenantId,
            { migrationStatus: "finalized" },
            prisma
          )
        ).toEqual({
          ...empty,
          activeCount: 1,
          migrationFinalizedCount: 1,
          totalCount: 1,
        })
        expect(
          (
            await listMembersTable(
              tenantId,
              { migrationStatus: "finalized" },
              prisma
            )
          ).data.map(({ id }) => id)
        ).toEqual([broughtForward.id])

        await tx.$executeRaw`
        UPDATE members SET joined_at = joined_at + interval '999 microseconds'
        WHERE tenant_id = ${tenantId}::uuid AND id = ${linked.id}::uuid
      `
        await tx.contribution.create({
          data: {
            tenantId,
            memberId: linked.id,
            postedAt: now,
            amount: "49.17",
            committedAmount: "40.07",
            extraSavingsAmount: "9.10",
            channel: "cash",
          },
        })
        const all = await listMemberStatementSummaries(tenantId, prisma)
        const sameJoinedDate = all.filter(
          (row) => row.joinedAt.getTime() === current.getTime()
        )
        const scoped = await listMemberStatementSummaries(
          tenantId,
          prisma,
          undefined,
          {
            fromDate: current,
            toDate: current,
          }
        )
        expect(scoped).toHaveLength(2)
        expect(scoped).toEqual(expect.arrayContaining(sameJoinedDate))
        expect(
          scoped.find((row) => row.memberId === linked.id)?.totalContributions
        ).toBe(49.17)
        const beforeEnrollment = new Date(prior.getTime() - 1)
        expect(
          await listMemberStatementSummaries(tenantId, prisma, undefined, {
            toDate: beforeEnrollment,
          })
        ).toEqual([])
        throw rollback
      })
      .catch((error) => {
        if (error !== rollback) throw error
      })
  }, 30_000)
})
