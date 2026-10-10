import { afterEach, describe, expect, it } from "bun:test"
import { sweepPrivateDashboardUploadOrphans } from "./private-blob-cleanup"

const original = {
  blob: process.env.BLOB_READ_WRITE_TOKEN,
  enabled: process.env.DASHBOARD_PRIVATE_BLOB_ENABLED,
  cleanup: process.env.DASHBOARD_UPLOAD_ORPHAN_CLEANUP_ENABLED,
  signing: process.env.DASHBOARD_UPLOAD_SIGNING_SECRET,
}

afterEach(() => {
  for (const [key, value] of Object.entries({
    BLOB_READ_WRITE_TOKEN: original.blob,
    DASHBOARD_PRIVATE_BLOB_ENABLED: original.enabled,
    DASHBOARD_UPLOAD_ORPHAN_CLEANUP_ENABLED: original.cleanup,
    DASHBOARD_UPLOAD_SIGNING_SECRET: original.signing,
  })) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

function enable() {
  process.env.BLOB_READ_WRITE_TOKEN = "test-only"
  process.env.DASHBOARD_PRIVATE_BLOB_ENABLED = "1"
  process.env.DASHBOARD_UPLOAD_ORPHAN_CLEANUP_ENABLED = "1"
  process.env.DASHBOARD_UPLOAD_SIGNING_SECRET = "test-only-signing-secret-with-at-least-32-characters"
}

describe("private upload orphan cleanup", () => {
  it("does nothing unless explicitly enabled", async () => {
    delete process.env.DASHBOARD_UPLOAD_ORPHAN_CLEANUP_ENABLED
    await expect(sweepPrivateDashboardUploadOrphans({}, {
      list: async () => { throw new Error("must not list") },
      claim: async () => true,
      removeBlob: async () => {},
      finish: async () => true,
    })).rejects.toThrow("disabled")
  })

  it("skips a pending row finalized concurrently and bounds each sweep", async () => {
    enable()
    let removed = 0
    const result = await sweepPrivateDashboardUploadOrphans({ limit: 500, now: new Date("2026-09-24T20:00:00Z") }, {
      list: async (before, limit) => {
        expect(before.toISOString()).toBe("2026-09-24T18:00:00.000Z")
        expect(limit).toBe(10)
        return [{ id: "id-a", tenantId: "tenant-a", status: "pending" }]
      },
      claim: async () => false,
      removeBlob: async () => { removed++ },
      finish: async () => true,
    })
    expect(result).toEqual({ scanned: 1, deleted: 0, failed: 0, skipped: 1 })
    expect(removed).toBe(0)
  })

  it("leaves a claimed row retryable when provider deletion fails", async () => {
    enable()
    let finished = 0
    const result = await sweepPrivateDashboardUploadOrphans({}, {
      list: async () => [{ id: "id-a", tenantId: "tenant-a", status: "deleted" }],
      claim: async () => { throw new Error("already claimed") },
      removeBlob: async () => { throw new Error("provider unavailable") },
      finish: async () => { finished++; return true },
    })
    expect(result.failed).toBe(1)
    expect(finished).toBe(0)
  })
})
