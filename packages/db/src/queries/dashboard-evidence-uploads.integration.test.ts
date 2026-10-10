import { afterAll, describe, expect, it } from "bun:test"
import { createPrismaClient } from "../prisma"
import { claimDashboardEvidenceUploadLink, finalizeDashboardEvidenceUpload } from "./dashboard-evidence-uploads"

const db = createPrismaClient()
const run = db && process.env.RUN_LOCAL_DB_INTEGRATION === "1" ? describe : describe.skip
const slug = `upload-it-${crypto.randomUUID().slice(0, 8)}`
let tenantId: string | null = null

run("dashboard evidence database finalization", () => {
  afterAll(async () => {
    if (db && tenantId) {
      await db.dashboardEvidenceUpload.deleteMany({ where: { tenantId } })
      await db.tenant.deleteMany({ where: { id: tenantId } })
    }
    await db?.$disconnect()
  })

  it("commits one audit for concurrent finalize attempts and preserves idempotence", async () => {
    if (!db) throw new Error("Database integration test is not configured.")
    const tenant = await db.tenant.create({ data: { name: "Evidence Integration Cooperative", slug, status: "active" } })
    tenantId = tenant.id
    const user = await db.user.create({
      data: {
        email: `${slug}@example.test`, fullName: "Evidence Integration User",
        passwordHash: "test-only", tenantId: tenant.id,
      },
    })
    const row = await db.dashboardEvidenceUpload.create({
      data: {
        id: crypto.randomUUID(), tenantId: tenant.id, uploaderUserId: user.id,
        purpose: "payment_receipt_proof", originalName: "proof.pdf",
        contentType: "application/pdf", declaredSize: 100,
      },
    })
    const input = {
      id: row.id, tenantId: tenant.id, uploaderUserId: user.id,
      purpose: row.purpose, contentType: row.contentType, storedSize: 100,
    }

    const results = await Promise.all([
      finalizeDashboardEvidenceUpload(input, db),
      finalizeDashboardEvidenceUpload(input, db),
    ])
    expect(results.filter((result) => result?.newlyUploaded)).toHaveLength(1)
    expect(results.filter((result) => result && !result.newlyUploaded)).toHaveLength(1)
    expect((await db.dashboardEvidenceUpload.findUniqueOrThrow({ where: { id: row.id } })).status).toBe("uploaded")
    expect(await db.auditLog.count({
      where: { tenantId: tenant.id, entityType: "DashboardUpload", entityId: row.id, action: "file.uploaded" },
    })).toBe(1)
  })

  it("rolls back a failed link transaction and allows only one business-record claim", async () => {
    if (!db || !tenantId) throw new Error("Database integration test is not configured.")
    const user = await db.user.findFirstOrThrow({ where: { tenantId } })
    const row = await db.dashboardEvidenceUpload.create({
      data: {
        id: crypto.randomUUID(), tenantId, uploaderUserId: user.id,
        purpose: "member_document", originalName: "identity.pdf",
        contentType: "application/pdf", declaredSize: 100, storedSize: 100,
        status: "uploaded", uploadedAt: new Date(),
      },
    })
    const url = `/api/uploads/${row.id}`
    const firstEntityId = crypto.randomUUID()
    await expect(db.$transaction(async (tx) => {
      await claimDashboardEvidenceUploadLink({ tenantId, url, purpose: "member_document", entityId: firstEntityId, claimantUserId: user.id }, tx)
      throw new Error("business write failed")
    })).rejects.toThrow("business write failed")
    expect((await db.dashboardEvidenceUpload.findUniqueOrThrow({ where: { id: row.id } })).linkedEntityId).toBeNull()
    await expect(claimDashboardEvidenceUploadLink({ tenantId, url, purpose: "support_attachment", entityId: firstEntityId, claimantUserId: user.id }, db)).rejects.toThrow("cannot be linked")
    const secondEntityId = crypto.randomUUID()
    const results = await Promise.allSettled([
      claimDashboardEvidenceUploadLink({ tenantId, url, purpose: "member_document", entityId: firstEntityId, claimantUserId: user.id }, db),
      claimDashboardEvidenceUploadLink({ tenantId, url, purpose: "member_document", entityId: secondEntityId, claimantUserId: user.id }, db),
    ])
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1)
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1)
    const linked = await db.dashboardEvidenceUpload.findUniqueOrThrow({ where: { id: row.id } })
    expect(linked.linkedEntityType).toBe("MemberDocument")
    expect([firstEntityId, secondEntityId]).toContain(linked.linkedEntityId)
  })
})
