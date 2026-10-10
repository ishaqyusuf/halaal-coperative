import { describe, expect, test } from "bun:test"
import { deriveMobileAdminCommandAuditId } from "./mobile-admin-finance-support-policy"
import { runMobileAdminCommand } from "./mobile-admin-finance-support"

const command = {
  actorUserId: "user-1",
  commandId: "898f6d69-f1e5-49c7-a7f7-01883a1bb3e9",
  commandType: "receipt.approved",
  entityId: "receipt-1",
  expectedState: "submitted",
  tenantId: "tenant-1",
}

describe("mobile admin command receipts", () => {
  test("replays the completed server result without executing the command again", async () => {
    let executions = 0
    const result = await runMobileAdminCommand(
      {
        ...command,
        execute: async () => {
          executions += 1
          return { id: "receipt-1", state: "approved" }
        },
      },
      {
        auditLog: {
          create: async () => {
            throw { code: "P2002" }
          },
          findFirst: async () => ({
            id: deriveMobileAdminCommandAuditId(
              command.tenantId,
              command.commandId
            ),
            metadata: {
              commandId: command.commandId,
              commandType: command.commandType,
              resultEntityId: "receipt-1",
              resultState: "approved",
              status: "completed",
            },
          }),
        },
      } as never
    )

    expect(executions).toBe(0)
    expect(result).toEqual({
      commandId: command.commandId,
      entityId: "receipt-1",
      replayed: true,
      state: "approved",
    })
  })

  test("keeps the processing claim when completion receipt finalization fails", async () => {
    const deletes: unknown[] = []

    await expect(
      runMobileAdminCommand(
        {
          ...command,
          execute: async () => ({ id: "receipt-1", state: "approved" }),
        },
        {
          auditLog: {
            create: async () => ({ id: "claim-1" }),
            deleteMany: async (input: unknown) => {
              deletes.push(input)
              return { count: 1 }
            },
            update: async () => {
              throw new Error("audit storage unavailable")
            },
          },
        } as never
      )
    ).rejects.toThrow("completed but its final receipt could not be confirmed")

    expect(deletes).toHaveLength(0)
  })

  test("releases the processing claim when the domain command fails before mutation confirmation", async () => {
    const deletes: unknown[] = []

    await expect(
      runMobileAdminCommand(
        {
          ...command,
          execute: async () => {
            throw new Error("stale expected state")
          },
        },
        {
          auditLog: {
            create: async () => ({ id: "claim-1" }),
            deleteMany: async (input: unknown) => {
              deletes.push(input)
              return { count: 1 }
            },
          },
        } as never
      )
    ).rejects.toThrow("stale expected state")

    expect(deletes).toHaveLength(1)
  })

  test("rejects a reused command id when its financial input fingerprint changes", async () => {
    await expect(
      runMobileAdminCommand(
        {
          ...command,
          commandFingerprint: "payment:35000",
          execute: async () => ({ id: "receipt-1", state: "approved" }),
        },
        {
          auditLog: {
            create: async () => {
              throw { code: "P2002" }
            },
            findFirst: async () => ({
              metadata: {
                commandFingerprint: "payment:25000",
                commandId: command.commandId,
                commandType: command.commandType,
                resultEntityId: "receipt-1",
                resultState: "approved",
                status: "completed",
              },
            }),
          },
        } as never
      )
    ).rejects.toThrow("already used for different work")
  })
})
