import { afterEach, describe, expect, it } from "bun:test"
import type { PrismaClient } from "../../db/generated/prisma/client"
import { deleteQaPrivateUploads } from "./qa-private-blob-storage"

const originalToken = process.env.BLOB_READ_WRITE_TOKEN
afterEach(() => {
  if (originalToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN
  else process.env.BLOB_READ_WRITE_TOKEN = originalToken
})

function dependencies(options: { markedAt: Date; createdAt: Date; providerFailure?: boolean }) {
  const order: string[] = []
  let listed = false
  const db = {
    dashboardEvidenceUpload: {
      findMany: async () => [{ id: "evidence-a", createdAt: options.createdAt }],
      deleteMany: async () => { order.push("metadata"); return { count: 1 } },
    },
    tenant: {
      findFirst: async () => ({ qaPurgeStartedAt: options.markedAt }),
    },
  } as unknown as PrismaClient
  return {
    order,
    db,
    listBlobs: (async () => {
      if (listed) return { blobs: [], hasMore: false }
      listed = true
      return { blobs: [{ pathname: "dashboard-evidence/tenant-qa/evidence-a", size: 42, etag: "etag-a" }], hasMore: false }
    }) as never,
    deleteBlob: (async () => {
      if (options.providerFailure) throw new Error("provider failed")
      order.push("blob")
    }) as never,
  }
}

describe("QA private Blob teardown", () => {
  const now = new Date("2026-09-24T20:00:00Z")

  it("waits for outstanding client tokens to expire", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "test-token"
    const deps = dependencies({ markedAt: new Date("2026-09-24T19:45:00Z"), createdAt: new Date("2026-09-24T18:00:00Z") })
    await expect(deleteQaPrivateUploads("tenant-qa", now, deps)).rejects.toThrow("cooldown")
    expect(deps.order).toEqual([])
  })

  it("deletes provider bytes before removing the Restrict-protected metadata", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "test-token"
    const deps = dependencies({ markedAt: new Date("2026-09-24T19:00:00Z"), createdAt: new Date("2026-09-24T18:00:00Z") })
    expect(await deleteQaPrivateUploads("tenant-qa", now, deps)).toEqual({ files: 1, fileBytes: 42 })
    expect(deps.order).toEqual(["blob", "metadata"])
  })

  it("preserves metadata when provider deletion fails", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "test-token"
    const deps = dependencies({ markedAt: new Date("2026-09-24T19:00:00Z"), createdAt: new Date("2026-09-24T18:00:00Z"), providerFailure: true })
    await expect(deleteQaPrivateUploads("tenant-qa", now, deps)).rejects.toThrow("provider failed")
    expect(deps.order).toEqual([])
  })
})
