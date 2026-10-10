import { describe, expect, test } from "bun:test"
import {
  createProductionQaHarnessPlan,
  executeProductionQaPositiveJourneys,
} from "@halaalvest/domain"

import { createProductionQaRoleSwitchAdapter } from "./production-qa-role-switch-proof"

const memberRole = {
  id: "membership-member",
  role: "member",
  workspaceRole: "member" as const,
}

function createPlan() {
  return createProductionQaHarnessPlan({
    environment: "local",
    now: new Date("2026-09-05T07:45:00.000Z"),
    qaDomain: "ishaq.qa.test",
    runId: "role-switch-adapter",
  })
}

function memberProfile(activeMembershipId = memberRole.id) {
  return {
    activeMembershipId,
    cooperativeRole: "member",
    role: "member",
    token: "replacement-token",
  }
}

describe("production QA role-switch adapter", () => {
  test("rotates to the member session, confirms it, then runs Android", async () => {
    const calls: string[] = []
    const replacementCaller = {
      auth: {
        mobile: {
          me: async () => {
            calls.push("me:replacement")
            return { profile: memberProfile() }
          },
          switchRole: async () => {
            throw new Error("The replacement session must not switch again.")
          },
        },
      },
    }
    const caller = {
      auth: {
        mobile: {
          me: async () => {
            throw new Error("The original session must not confirm the switch.")
          },
          switchRole: async ({ membershipId }: { membershipId: string }) => {
            calls.push(`switch:${membershipId}`)
            return { profile: memberProfile(membershipId) }
          },
        },
      },
    }
    const receipt = await executeProductionQaPositiveJourneys({
      adapter: createProductionQaRoleSwitchAdapter({
        activateReplacementSession: async ({ token }) => {
          calls.push(`activate:${token}`)
          return { caller: replacementCaller, previousSessionRevoked: true }
        },
        androidCheckpoint: async (evidence) => {
          calls.push(
            `android:${evidence.previousRole}->${evidence.currentRole}`
          )
          return { status: "passed" }
        },
        availableRoles: [
          {
            id: "membership-admin",
            role: "tenant_admin",
            workspaceRole: "admin",
          },
          memberRole,
        ],
        caller,
      }),
      journeyKeys: ["workspace-role-switch"],
      plan: createPlan(),
    })

    expect(calls).toEqual([
      "switch:membership-member",
      "activate:replacement-token",
      "me:replacement",
      "android:tenant_admin->member",
    ])
    expect(receipt.summary).toMatchObject({
      blockedJourneys: 0,
      failedJourneys: 0,
      passedJourneys: 1,
      passedSteps: 3,
    })
  })

  test("fails closed when the switch response does not select the member role", async () => {
    const receipt = await executeProductionQaPositiveJourneys({
      adapter: createProductionQaRoleSwitchAdapter({
        activateReplacementSession: async () => {
          throw new Error("An invalid profile must not be activated.")
        },
        availableRoles: [memberRole],
        caller: {
          auth: {
            mobile: {
              me: async () => ({ profile: memberProfile() }),
              switchRole: async () => ({
                profile: {
                  ...memberProfile("membership-admin"),
                  cooperativeRole: "tenant_admin",
                  role: "admin",
                },
              }),
            },
          },
        },
      }),
      journeyKeys: ["workspace-role-switch"],
      plan: createPlan(),
    })

    expect(receipt.journeys[0]?.steps[0]).toMatchObject({
      code: "ASSERTION_FAILED",
      status: "failed",
    })
    expect(receipt.summary.passedSteps).toBe(0)
  })

  test("blocks before transport when the multi-role fixture is missing", async () => {
    const receipt = await executeProductionQaPositiveJourneys({
      adapter: createProductionQaRoleSwitchAdapter({
        activateReplacementSession: async () => {
          throw new Error("Missing fixtures must not activate a session.")
        },
        availableRoles: [],
        caller: {
          auth: {
            mobile: {
              me: async () => ({ profile: memberProfile() }),
              switchRole: async () => {
                throw new Error("Missing fixtures must not call switchRole.")
              },
            },
          },
        },
      }),
      journeyKeys: ["workspace-role-switch"],
      plan: createPlan(),
    })

    expect(receipt.journeys[0]?.steps[0]).toMatchObject({
      code: "FIXTURE_MISSING",
      status: "blocked",
    })
  })
})
