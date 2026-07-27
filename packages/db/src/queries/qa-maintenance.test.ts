import { describe, expect, test } from "bun:test"
import {
  assertQaIdentityLane,
  resolveConfiguredQaDomain,
} from "./qa-maintenance"

function createLanePrisma(
  dataClassification: "live" | "qa",
  qaSourceDomain: string | null,
) {
  return {
    tenant: {
      findUnique: async () => ({ dataClassification, qaSourceDomain }),
    },
  }
}

describe("QA workspace classification", () => {
  test("matches configured QA domains without exposing route destinations", () => {
    expect(
      resolveConfiguredQaDomain("Operator@team.example.test", [
        "team.example.test",
      ]),
    ).toBe("team.example.test")
    expect(
      resolveConfiguredQaDomain("operator@example.com", [
        "team.example.test",
      ]),
    ).toBeNull()
  })

  test("allows only the source QA domain inside a QA workspace", async () => {
    await expect(
      assertQaIdentityLane({
        email: "member@team.example.test",
        prisma: createLanePrisma("qa", "team.example.test"),
        tenantId: "tenant-qa",
      }),
    ).resolves.toBeUndefined()

    await expect(
      assertQaIdentityLane({
        email: "member@example.com",
        prisma: createLanePrisma("qa", "team.example.test"),
        tenantId: "tenant-qa",
      }),
    ).rejects.toThrow("Normal identities")
  })

  test("rejects synthetic identities inside live workspaces", async () => {
    await expect(
      assertQaIdentityLane({
        email: "member@team.example.test",
        prisma: createLanePrisma("live", null),
        tenantId: "tenant-live",
      }),
    ).rejects.toThrow("QA identities")
  })
})
