import { describe, expect, test } from "bun:test"

import { createCallerFactory } from "../lib.trpc"
import { appRouter } from "./_app"

const createCaller = createCallerFactory(appRouter)

// Reads check the role already loaded for the request, before any database call.
function callerFor(role: string) {
  return createCaller({
    auth: {
      activeMembership: {
        id: "membership-1",
        role,
        tenantId: "tenant-1",
        userId: "user-1",
      },
      session: { user: { id: "user-1" } },
    },
    request: { mobileAuthenticated: false },
    runtime: { status: "database-configured" },
    tenant: { current: { id: "tenant-1", qaPurgeStartedAt: null } },
  } as never)
}

const forbidden = { code: "FORBIDDEN" }
const badRequest = { code: "BAD_REQUEST" }

describe("cooperative mobile access role guards", () => {
  test("only cooperative administrators read the lists", async () => {
    for (const role of ["member", "finance_officer", "operations_officer"]) {
      const caller = callerFor(role)
      await expect(
        caller.cooperativeMobileAccess.summary()
      ).rejects.toMatchObject(forbidden)
      await expect(
        caller.cooperativeMobileAccess.queue({ status: "pending", limit: 5 })
      ).rejects.toMatchObject(forbidden)
      await expect(
        caller.cooperativeMobileAccess.members({ limit: 5 })
      ).rejects.toMatchObject(forbidden)
    }
  })

  test("only members read their own status", async () => {
    await expect(
      callerFor("tenant_admin").cooperativeMobileAccess.memberStatus()
    ).rejects.toMatchObject(forbidden)
  })

  test("rejects unknown list names and malformed cursors", async () => {
    const caller = callerFor("tenant_admin")
    await expect(
      caller.cooperativeMobileAccess.queue({
        status: "approved" as never,
        limit: 5,
      })
    ).rejects.toMatchObject(badRequest)
    await expect(
      caller.cooperativeMobileAccess.members({ cursor: "short", limit: 5 })
    ).rejects.toMatchObject(badRequest)
  })
})
