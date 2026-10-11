import { expect, test } from "bun:test"
import { getQaAcceleratorCapability } from "./qa-accelerator-config"
test("production deployment identity overrides a conflicting Preview flag", () => {
  const keys = [
    "HALAALVEST_ENV",
    "VERCEL_ENV",
    "QA_ACCELERATOR_SECRET",
    "QA_ACCELERATOR_ENABLED",
  ] as const
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]))
  try {
    process.env.HALAALVEST_ENV = "preview"
    process.env.VERCEL_ENV = "production"
    process.env.QA_ACCELERATOR_SECRET = "synthetic-test-secret"
    process.env.QA_ACCELERATOR_ENABLED = "true"
    expect(
      getQaAcceleratorCapability({ clientKind: "mobile", contractVersion: 1 })
        .available
    ).toBe(false)
  } finally {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key]
      else process.env[key] = saved[key]
    }
  }
})
