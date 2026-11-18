import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import { createPrismaClient } from "../prisma"
import { getActivityReportEvent, listActivityReportEvents } from "./audit"
import { getMobileAdminReportsOverview } from "./mobile-admin-reports-access"

/**
 * T23 mobile admin reports: the overview counts members from one grouped
 * read and no longer carries activity or follow-ups (the screen pages
 * activity itself); the Record chips filter by area; the detail read keeps
 * up to 8 change lines.
 */
const db = createPrismaClient()
const run =
  db && process.env.RUN_LOCAL_DB_INTEGRATION === "1" ? describe : describe.skip
const nonce = crypto.randomUUID().slice(0, 8)
let tenantId = ""
let detailId = ""

run("mobile admin reports reads", () => {
  beforeAll(async () => {
    const tenant = await db!.tenant.create({
      data: {
        name: `Reports ${nonce}`,
        slug: `reports-it-${nonce}`,
        status: "active",
      },
    })
    tenantId = tenant.id
    await db!.member.createMany({
      data: (["active", "active", "suspended"] as const).map(
        (status, index) => ({
          fullName: `Member ${index}`,
          joinedAt: new Date("2026-01-01T00:00:00.000Z"),
          memberNumber: `QHC-${index}`,
          memberType: "individual" as const,
          status,
          tenantId,
        })
      ),
    })
    await db!.auditLog.createMany({
      data: [
        { action: "member.created", entityType: "Member" },
        { action: "charge.applied", entityType: "ChargeApplication" },
      ].map((row) => ({ ...row, actorType: "system" as const, occurredAt: new Date(), tenantId })),
    })
    const detail = await db!.auditLog.create({
      data: {
        action: "member_share_application.approved",
        actorType: "system",
        entityType: "MemberShareApplication",
        occurredAt: new Date(),
        metadata: {
          next: { amount: 50_000, approvedUnits: 5, priority: "high", requestedUnits: 5, stage: "posted", status: "approved" },
          notes: "Matched in the bank statement",
          previous: { amount: 0, approvedUnits: 0, priority: "normal", requestedUnits: 4, stage: "review", status: "pending" },
          reviewNotes: "Approved in full",
        },
        tenantId,
      },
    })
    detailId = detail.id
  })

  afterAll(async () => {
    await db!.auditLog.deleteMany({ where: { tenantId } })
    await db!.tenant.deleteMany({ where: { id: tenantId } })
  })

  it("counts members once and drops the unused lists", async () => {
    const overview = await getMobileAdminReportsOverview(tenantId)
    expect(overview.activityEvents).toEqual([])
    expect(overview.collectionFollowUps).toEqual([])
    expect(overview.reports.find((card) => card.key === "members")?.metricValue).toBe(3)
    expect(overview.stats.find((stat) => stat.key === "active-members")?.value).toBe(2)
  })

  it("filters activity by area and keeps 8 detail lines", async () => {
    const members = await listActivityReportEvents(tenantId, { area: "members", limit: 10 })
    expect(members.map((event) => event.action)).toEqual(["member.created"])
    const detail = await getActivityReportEvent(tenantId, detailId)
    expect(detail?.metadataSummary.length).toBeLessThanOrEqual(8)
    expect(detail?.metadataSummary.length).toBeGreaterThan(3)
  })
})
