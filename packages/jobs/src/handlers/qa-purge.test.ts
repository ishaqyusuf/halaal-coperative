import { describe, expect, test } from "bun:test"
import { qaPurgeHandler, type QaPurgeDependencies } from "./qa-purge"

const startedAt = new Date("2026-11-15T10:00:00.000Z")
const counts = {
  auditLogs: 4,
  fileBytes: 0,
  files: 0,
  ledgerTransactions: 3,
  members: 2,
  users: 1,
  workspaces: 2,
}

function harness(confirmed: Record<string, string[] | null>) {
  const deleted: string[] = []
  const finished: unknown[] = []
  const deps = {
    beginRun: async () => ({
      counts,
      startedAt,
      tenants: [
        { hostnames: ["qa-a.preview.example"], id: "tenant-qa" },
        { hostnames: ["old.preview.example"], id: "tenant-reclassified" },
      ],
    }),
    blockRun: async () => {
      throw new Error("not blocked")
    },
    confirmTenant: async (input: { startedAt: Date; tenantId: string }) => {
      expect(input.startedAt).toBe(startedAt)
      const hostnames = confirmed[input.tenantId]
      return hostnames ? { hostnames } : null
    },
    credentialBlocker: () => null,
    deleteDomains: async (hostnames: string[]) => {
      deleted.push(...hostnames.map((hostname) => `domain:${hostname}`))
    },
    deletePrivateUploads: async (tenantId: string) => {
      deleted.push(`private:${tenantId}`)
      return { fileBytes: 5, files: 1 }
    },
    deleteTenant: async (
      tenantId: string,
      _prisma: unknown,
      expected?: Date
    ) => {
      expect(expected).toBe(startedAt)
      deleted.push(`tenant:${tenantId}`)
    },
    deleteUploads: async (tenantId: string) => {
      deleted.push(`uploads:${tenantId}`)
      return { fileBytes: 10, files: 2 }
    },
    finishRun: async (input: unknown) => {
      finished.push(input)
    },
    getRun: async () => ({ status: "queued" }),
  } as unknown as QaPurgeDependencies
  return { deleted, deps, finished }
}

describe("QA purge job", () => {
  test("deletes nothing outside the database for a tenant that is no longer QA", async () => {
    const { deleted, deps, finished } = harness({
      "tenant-qa": ["qa-a.preview.example"],
      "tenant-reclassified": null,
    })

    const result = await qaPurgeHandler({ runId: "run-1" }, deps)

    expect(deleted).toEqual([
      "uploads:tenant-qa",
      "private:tenant-qa",
      "domain:qa-a.preview.example",
      "tenant:tenant-qa",
    ])
    expect(result.errors).toEqual(["tenant_not_qa"])
    expect(finished).toEqual([
      expect.objectContaining({
        errorCategory: "tenant_not_qa",
        status: "partially_completed",
      }),
    ])
  })

  test("removes the hostnames the tenant has now, not the preview's", async () => {
    const { deleted, deps, finished } = harness({
      "tenant-qa": ["qa-a.preview.example"],
      "tenant-reclassified": ["new.preview.example"],
    })

    await qaPurgeHandler({ runId: "run-1" }, deps)

    expect(deleted).toContain("domain:new.preview.example")
    expect(deleted).not.toContain("domain:old.preview.example")
    expect(finished).toEqual([
      expect.objectContaining({
        counts: expect.objectContaining({ fileBytes: 30, files: 6 }),
        status: "completed",
      }),
    ])
  })
})
