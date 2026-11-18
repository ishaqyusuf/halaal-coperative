import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { createPrismaClient } from "@halaalvest/db"

import { buildRequestContext } from "../context"
import { createCallerFactory } from "../lib.trpc"
import { appRouter } from "./_app"
import { neutralRecoveryResponse } from "./mobile-account-access.route"

const prisma = createPrismaClient()
const runIntegration = prisma ? describe : describe.skip
const suffix = crypto.randomUUID().slice(0, 8)
const slug = `recovery-devcode-${suffix}`
// Prefixes are three to five letters; "Q" plus four random letters.
const prefix = `Q${Array.from(
  crypto.getRandomValues(new Uint8Array(4)),
  (byte) => String.fromCharCode(65 + (byte % 26))
).join("")}`
const cooperativeNumber = `${prefix}-0001`
const email = `${slug}@example.test`
const createCaller = createCallerFactory(appRouter)

const envKeys = [
  "APP_ENV",
  "AUTH_EVIDENCE_SECRET",
  "NODE_ENV",
  "RESEND_API_KEY",
  "VERCEL_ENV",
] as const
type EnvCase = Partial<Record<(typeof envKeys)[number], string>>

// A production runtime refuses to hash without its own secret; this one is
// generated per run and never leaves the test process.
const testEvidenceSecret = crypto.randomUUID() + crypto.randomUUID()

// Runs one recovery request for a real account under the given runtime
// signals. The email provider key is always cleared so no case can reach a
// live mail provider; the route catches the failed delivery either way.
async function requestRecoveryUnder(env: EnvCase, deviceId: string) {
  const saved = Object.fromEntries(
    envKeys.map((key) => [key, process.env[key]])
  )
  try {
    for (const key of envKeys) delete process.env[key]
    for (const [key, value] of Object.entries(env)) process.env[key] = value
    const context = await buildRequestContext(
      new Headers({
        host: "api.halaalvest.localhost",
        "x-mobile-device-id": deviceId,
      })
    )
    return await createCaller(context).auth.mobile.recovery.request({
      cooperativeNumber,
      deviceId,
      email,
    })
  } finally {
    for (const key of envKeys) {
      const value = saved[key]
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

runIntegration("mobile password recovery devCode exposure", () => {
  let tenantId: string | null = null

  beforeAll(async () => {
    if (!prisma) return
    const tenant = await prisma.tenant.create({
      data: {
        cooperativeCodePrefix: prefix,
        name: "Recovery devCode Cooperative",
        slug,
        status: "active",
      },
    })
    tenantId = tenant.id
    await prisma.user.create({
      data: {
        cooperativeAccessCode: cooperativeNumber,
        email,
        fullName: "Recovery devCode Member",
        tenantId: tenant.id,
      },
    })
  })

  afterAll(async () => {
    if (!prisma) return
    await prisma.user.deleteMany({ where: { email } })
    if (tenantId) await prisma.tenant.deleteMany({ where: { id: tenantId } })
    await prisma.$disconnect()
  })

  // Control: proves the cases below reach the matched-account branch, where
  // a code is actually created, rather than the neutral unknown-account path.
  test("a development profile returns the fixed code for a real account", async () => {
    const response = await requestRecoveryUnder(
      { APP_ENV: "local", NODE_ENV: "development" },
      `recovery-devcode-control-${suffix}`
    )
    expect(response).toMatchObject({ devCode: "123456" })
  })

  const productionLikeCases: Array<[string, EnvCase]> = [
    [
      "NODE_ENV=production",
      {
        APP_ENV: "local",
        AUTH_EVIDENCE_SECRET: testEvidenceSecret,
        NODE_ENV: "production",
      },
    ],
    [
      "VERCEL_ENV=production",
      { APP_ENV: "local", NODE_ENV: "development", VERCEL_ENV: "production" },
    ],
    ["APP_ENV=production", { APP_ENV: "production", NODE_ENV: "development" }],
    ["APP_ENV=preview", { APP_ENV: "preview", NODE_ENV: "development" }],
    ["APP_ENV=staging", { APP_ENV: "staging", NODE_ENV: "development" }],
    ["APP_ENV unset", { NODE_ENV: "development" }],
  ]

  for (const [label, env] of productionLikeCases) {
    test(`never returns devCode when ${label}`, async () => {
      const response = await requestRecoveryUnder(
        env,
        `recovery-devcode-${label.replace(/\W+/g, "-")}-${suffix}`
      )
      expect(response).toMatchObject(neutralRecoveryResponse)
      expect(response.challengeId).toMatch(/^[0-9a-f-]{36}$/)
      expect(response).not.toHaveProperty("devCode")
    })
  }
})
