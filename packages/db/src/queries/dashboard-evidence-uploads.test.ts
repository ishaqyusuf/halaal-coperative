import { describe, expect, it } from "bun:test"
import type { PrismaClient } from "../../generated/prisma/client"
import {
  claimDashboardEvidenceUploadLink,
  createDashboardEvidenceUpload,
  finalizeDashboardEvidenceUpload,
  getPendingDashboardEvidenceUpload,
  getUploadedDashboardEvidenceUpload,
} from "./dashboard-evidence-uploads"

function fakeDatabase() {
  const row = {
    id: "843cfde3-1d9f-4d94-9a27-8f3a8ee81072",
    tenantId: "tenant-a",
    uploaderUserId: "user-a",
    purpose: "payment_receipt_proof",
    contentType: "application/pdf",
    declaredSize: 100,
    storedSize: null as number | null,
    status: "pending",
    deletedAt: null,
    originalName: "proof.pdf",
  }
  let writes = 0
  let audits = 0
  const dashboardEvidenceUpload = {
    findFirst: async ({ where }: { where: Record<string, unknown> }) =>
      Object.entries(where).every(([key, value]) => value === undefined || row[key as keyof typeof row] === value)
        ? { ...row }
        : null,
    updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      if (where.status !== row.status || where.id !== row.id) return { count: 0 }
      Object.assign(row, data)
      writes++
      return { count: 1 }
    },
    findUnique: async () => ({ ...row }),
  }
  const tx = {
    dashboardEvidenceUpload,
    auditLog: { create: async () => { audits++; return {} } },
  }
  const db = {
    ...tx,
    $transaction: async (action: (transaction: typeof tx) => Promise<unknown>) => action(tx),
  }
  return { db: db as unknown as PrismaClient, row, get writes() { return writes }, get audits() { return audits } }
}

describe("durable dashboard evidence state", () => {
  const input = {
    id: "843cfde3-1d9f-4d94-9a27-8f3a8ee81072",
    tenantId: "tenant-a",
    uploaderUserId: "user-a",
    purpose: "payment_receipt_proof",
    contentType: "application/pdf",
    storedSize: 100,
  }

  it("claims each purpose for one matching business record and rejects reuse or mismatch", async () => {
    const cases = [
      ["member_document", "MemberDocument"],
      ["opening_balance_source", "MemberOpeningBalance"],
      ["payment_receipt_proof", "MemberPaymentReceipt"],
      ["support_attachment", "SupportCaseMessage"],
    ] as const
    for (const [purpose, entityType] of cases) {
      const row = {
        id: input.id, tenantId: input.tenantId, purpose, uploaderUserId: input.uploaderUserId,
        status: "uploaded", deletedAt: null,
        linkedEntityType: null as string | null,
        linkedEntityId: null as string | null,
      }
      const db = {
        dashboardEvidenceUpload: {
          findUnique: async () => ({ ...row }),
          updateMany: async ({ where, data }: { where: { linkedEntityType: null; linkedEntityId: null }; data: { linkedEntityType: string; linkedEntityId: string } }) => {
            if (row.linkedEntityType !== where.linkedEntityType || row.linkedEntityId !== where.linkedEntityId) return { count: 0 }
            row.linkedEntityType = data.linkedEntityType
            row.linkedEntityId = data.linkedEntityId
            return { count: 1 }
          },
        },
      } as unknown as PrismaClient
      const url = `/api/uploads/${row.id}`
      await expect(claimDashboardEvidenceUploadLink({ tenantId: input.tenantId, url, purpose, entityId: input.id, claimantUserId: input.uploaderUserId }, db)).resolves.toBeUndefined()
      expect(row.linkedEntityType).toBe(entityType)
      await expect(claimDashboardEvidenceUploadLink({ tenantId: input.tenantId, url, purpose, entityId: input.id, claimantUserId: input.uploaderUserId }, db)).resolves.toBeUndefined()
      await expect(claimDashboardEvidenceUploadLink({ tenantId: input.tenantId, url, purpose, entityId: crypto.randomUUID(), claimantUserId: input.uploaderUserId }, db)).rejects.toMatchObject({ code: "CONFLICT", reportable: false })
      const otherPurpose = cases.find(([candidate]) => candidate !== purpose)![0]
      await expect(claimDashboardEvidenceUploadLink({ tenantId: input.tenantId, url, purpose: otherPurpose, entityId: input.id, claimantUserId: input.uploaderUserId }, db)).rejects.toMatchObject({ code: "PERMISSION_DENIED", reportable: false })
      await expect(claimDashboardEvidenceUploadLink({ tenantId: crypto.randomUUID(), url, purpose, entityId: input.id, claimantUserId: input.uploaderUserId }, db)).rejects.toMatchObject({ code: "PERMISSION_DENIED", reportable: false })
      await expect(claimDashboardEvidenceUploadLink({ tenantId: input.tenantId, url, purpose, entityId: input.id, claimantUserId: "another-user" }, db)).rejects.toMatchObject({ code: "PERMISSION_DENIED", reportable: false })
    }
  })

  it("refuses new intents and tokens after QA purge is marked", async () => {
    let created = 0
    const db = {
      $transaction: async (action: (tx: unknown) => Promise<unknown>) => action({
        tenant: { findFirst: async () => null },
        dashboardEvidenceUpload: { create: async () => { created++; return {} } },
      }),
      dashboardEvidenceUpload: {
        findFirst: async ({ where }: { where: { tenant: { qaPurgeStartedAt: null } } }) => {
          expect(where.tenant.qaPurgeStartedAt).toBeNull()
          return null
        },
      },
    } as unknown as PrismaClient
    await expect(createDashboardEvidenceUpload({
      id: input.id, tenantId: input.tenantId, uploaderUserId: input.uploaderUserId,
      purpose: input.purpose, originalName: "proof.pdf", contentType: input.contentType,
      declaredSize: input.storedSize,
    }, db)).rejects.toThrow("unavailable for uploads")
    expect(created).toBe(0)
    expect(await getPendingDashboardEvidenceUpload({
      id: input.id, tenantId: input.tenantId, uploaderUserId: input.uploaderUserId,
      purpose: input.purpose,
    }, db)).toBeNull()
  })

  it("rejects a provider object whose size or uploader differs from the recorded intent", async () => {
    const state = fakeDatabase()
    expect(await finalizeDashboardEvidenceUpload({ ...input, storedSize: 101 }, state.db)).toBeNull()
    expect(await finalizeDashboardEvidenceUpload({ ...input, uploaderUserId: "user-b" }, state.db)).toBeNull()
    expect(state.writes).toBe(0)
    expect(state.audits).toBe(0)
  })

  it("claims a verified object once and supports idempotent finalize", async () => {
    const state = fakeDatabase()
    expect(await getUploadedDashboardEvidenceUpload({ id: input.id, tenantId: input.tenantId }, state.db)).toBeNull()
    expect((await finalizeDashboardEvidenceUpload(input, state.db))?.newlyUploaded).toBe(true)
    expect((await finalizeDashboardEvidenceUpload(input, state.db))?.newlyUploaded).toBe(false)
    expect(state.writes).toBe(1)
    expect(state.audits).toBe(1)
    expect((await getUploadedDashboardEvidenceUpload({ id: input.id, tenantId: input.tenantId }, state.db))?.status).toBe("uploaded")
  })

  it("does not publish uploaded state when the audit insert fails", async () => {
    const state = fakeDatabase()
    const transactional = {
      $transaction: async (action: (tx: unknown) => Promise<unknown>) => {
        const snapshot = { ...state.row }
        const tx = {
          dashboardEvidenceUpload: {
            findFirst: async ({ where }: { where: Record<string, unknown> }) =>
              Object.entries(where).every(([key, value]) => value === undefined || snapshot[key as keyof typeof snapshot] === value)
                ? { ...snapshot }
                : null,
            updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
              if (where.status !== snapshot.status || where.id !== snapshot.id) return { count: 0 }
              Object.assign(snapshot, data)
              return { count: 1 }
            },
            findUnique: async () => ({ ...snapshot }),
          },
          auditLog: { create: async () => { throw new Error("audit storage unavailable") } },
        }
        const result = await action(tx)
        Object.assign(state.row, snapshot)
        return result
      },
    } as unknown as PrismaClient

    await expect(finalizeDashboardEvidenceUpload(input, transactional)).rejects.toThrow("audit storage unavailable")
    expect(state.row.status).toBe("pending")
    expect(state.row.storedSize).toBeNull()
  })
})
