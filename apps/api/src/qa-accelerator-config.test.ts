import { expect, test } from "bun:test"
import {
  getQaAcceleratorCapability,
  isConfiguredQaEntryDomain,
  resolveQaPolicyGate,
  type QaPolicyGate,
} from "./qa-accelerator-config"

const keys = [
  "HALAALVEST_ENV",
  "VERCEL_ENV",
  "APP_ENV",
  "NODE_ENV",
  "QA_ACCELERATOR_SECRET",
  "QA_ACCELERATOR_ENABLED",
  "QA_POLICY_URL",
  "QA_POLICY_READ_KEY",
  "EMAIL_QA_DOMAIN_ROUTES",
] as const

async function withEnv(values: Partial<Record<(typeof keys)[number], string>>, run: () => Promise<void>) {
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]))
  try {
    for (const key of keys) delete process.env[key]
    Object.assign(process.env, values)
    await run()
  } finally {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key]
      else process.env[key] = saved[key]
    }
  }
}

const secret = "x".repeat(40)

test("production deployment identity overrides a conflicting Preview flag", () =>
  withEnv(
    { HALAALVEST_ENV: "preview", VERCEL_ENV: "production", QA_ACCELERATOR_SECRET: "synthetic-test-secret", QA_ACCELERATOR_ENABLED: "true" },
    async () => {
      const capability = await getQaAcceleratorCapability({ clientKind: "mobile", contractVersion: 1 })
      expect(capability.available).toBe(false)
    }
  ))

test("without QA_POLICY_URL the local QA domain routes apply", () =>
  withEnv(
    { APP_ENV: "local", QA_ACCELERATOR_SECRET: secret, EMAIL_QA_DOMAIN_ROUTES: '{"team.qa.test":"tester@example.com"}' },
    async () => {
      expect(await resolveQaPolicyGate()).toEqual({ managed: false })
      expect(await isConfiguredQaEntryDomain("team.qa.test")).toBe(true)
      expect(await isConfiguredQaEntryDomain("other.qa.test")).toBe(false)
    }
  ))

test("an Oversight policy decides environments and domains, and fails closed", () =>
  withEnv(
    {
      APP_ENV: "local",
      QA_ACCELERATOR_SECRET: secret,
      EMAIL_QA_DOMAIN_ROUTES: '{"team.qa.test":"tester@example.com"}',
      QA_POLICY_URL: "https://oversight.invalid/api/qa-policy/v1/halaalvest",
      QA_POLICY_READ_KEY: "k".repeat(40),
    },
    async () => {
      const on: QaPolicyGate = { managed: true, enabled: true, domains: new Set(["team.qa.test"]) }
      const off: QaPolicyGate = { managed: true, enabled: false, domains: new Set() }
      expect(await isConfiguredQaEntryDomain("team.qa.test", on)).toBe(true)
      expect(await isConfiguredQaEntryDomain("other.qa.test", on)).toBe(false)
      expect(await isConfiguredQaEntryDomain("team.qa.test", off)).toBe(false)
      expect((await getQaAcceleratorCapability({ clientKind: "web", contractVersion: 1 }, off)).available).toBe(false)
      expect((await getQaAcceleratorCapability({ clientKind: "web", contractVersion: 1 }, on)).available).toBe(true)
      // The policy host is unreachable here: QA is off, not open.
      const gate = await resolveQaPolicyGate()
      expect(gate).toMatchObject({ managed: true, enabled: false })
    }
  ))
