import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  getScopedAuthSessionCookieName,
  getScopedAuthUserCookieName,
  verifySignedSessionToken,
} from "@halaalvest/auth"
import { revokeQaTesterCredential } from "@halaalvest/db"
import { buildRequestContext } from "../context"
import { createCallerFactory } from "../lib.trpc"
import { appRouter } from "./_app"
import { randomQaTesterCredential } from "./qa-accelerator.route"

describe("qaAcceleratorRouter", () => {
  const createCaller = createCallerFactory(appRouter)
  const original = {
    databaseUrl: process.env.HALAALVEST_DATABASE_URL,
    enabled: process.env.QA_ACCELERATOR_ENABLED,
    environment: process.env.HALAALVEST_ENV,
    secret: process.env.QA_ACCELERATOR_SECRET,
    testerCredential: process.env.QA_ACCELERATOR_TESTER_CREDENTIAL,
  }

  beforeAll(() => {
    delete process.env.HALAALVEST_DATABASE_URL
    process.env.HALAALVEST_ENV = "local"
    process.env.QA_ACCELERATOR_ENABLED = "true"
    process.env.QA_ACCELERATOR_SECRET = "qa-accelerator-test-secret"
    process.env.QA_ACCELERATOR_TESTER_CREDENTIAL =
      "valid-local-tester-credential"
  })

  afterAll(() => {
    for (const [key, value] of Object.entries({
      HALAALVEST_DATABASE_URL: original.databaseUrl,
      HALAALVEST_ENV: original.environment,
      QA_ACCELERATOR_ENABLED: original.enabled,
      QA_ACCELERATOR_SECRET: original.secret,
      QA_ACCELERATOR_TESTER_CREDENTIAL: original.testerCredential,
    })) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })

  async function caller() {
    return createCaller(
      await buildRequestContext(
        new Headers({
          host: "api.halaalvest.localhost",
          "x-mobile-device-id": "qa-test-device-0001",
          "x-mobile-platform": "ios",
        })
      )
    )
  }

  test("generates fixed-width numeric tester credentials with 256-bit source entropy", () => {
    const first = randomQaTesterCredential()
    const second = randomQaTesterCredential()

    expect(first).toMatch(/^\d{78}$/)
    expect(second).toMatch(/^\d{78}$/)
    expect(second).not.toBe(first)
  })

  test("reports the versioned capability in local, development, and preview", async () => {
    const client = await caller()
    for (const environment of ["local", "development", "preview"]) {
      process.env.HALAALVEST_ENV = environment
      await expect(
        client.qaAccelerator.capability({
          clientKind: "mobile",
          contractVersion: 1,
        })
      ).resolves.toMatchObject({
        available: true,
        environment,
        status: "available",
      })
    }
    process.env.HALAALVEST_ENV = "local"
  })

  test("authorizes one exact QA Domain and enters an ordinary mobile session", async () => {
    const client = await caller()
    await expect(
      client.qaAccelerator.authorize({
        clientId: "qa-test-device-0001",
        clientKind: "mobile",
        contractVersion: 1,
        credential: "wrong-local-tester-credential",
        qaDomain: "safa.qa.test",
      })
    ).rejects.toThrow()

    const authorization = await client.qaAccelerator.authorize({
      clientId: "qa-test-device-0001",
      clientKind: "mobile",
      contractVersion: 1,
      credential: "valid-local-tester-credential",
      qaDomain: "SAFA.QA.TEST.",
    })
    expect(authorization.authorizationToken).toStartWith("hqa_auth_")
    expect(authorization).not.toHaveProperty("credential")

    const profiles = await client.qaAccelerator.profiles({
      authorizationToken: authorization.authorizationToken,
      clientId: "qa-test-device-0001",
      clientKind: "mobile",
      contractVersion: 1,
    })
    expect(profiles.qaDomain).toBe("safa.qa.test")
    expect(profiles.profiles).toHaveLength(3)
    expect(profiles.profiles.map((profile) => profile.role)).toEqual([
      "tenant_admin",
      "member",
      "finance_officer",
    ])
    expect(JSON.stringify(profiles)).not.toContain("password")

    const entered = await client.qaAccelerator.enterProfile({
      authorizationToken: authorization.authorizationToken,
      clientId: "qa-test-device-0001",
      clientKind: "mobile",
      contractVersion: 1,
      selectionRef: profiles.profiles[0]!.selectionRef,
    })
    expect(entered.clientKind).toBe("mobile")
    if (entered.clientKind === "mobile") {
      expect(entered.profile.qaAuthorized).toBe(true)
      expect(entered.profile.tenant.slug).toBe("safa-qa")
      expect(entered.profile.cooperativeRole).toBe("tenant_admin")
    }
  })

  test("fails closed in production even with forged client inputs", async () => {
    process.env.HALAALVEST_ENV = "production"
    const capability = await (
      await caller()
    ).qaAccelerator.capability({
      clientKind: "web",
      contractVersion: 1,
    })
    expect(capability).toMatchObject({
      available: false,
      status: "unavailable",
    })
    process.env.HALAALVEST_ENV = "local"
  })

  test("binds authorization to its token, client signal, client kind, and eligible profile", async () => {
    const client = await caller()
    const authorization = await client.qaAccelerator.authorize({
      clientId: "qa-bound-device-0001",
      clientKind: "mobile",
      contractVersion: 1,
      credential: "valid-local-tester-credential",
      qaDomain: "safa.qa.test",
    })

    await expect(
      client.qaAccelerator.profiles({
        authorizationToken: "hqa_auth_forged-token-material",
        clientId: "qa-bound-device-0001",
        clientKind: "mobile",
        contractVersion: 1,
      })
    ).rejects.toThrow("Sign in again to continue")

    await expect(
      client.qaAccelerator.profiles({
        authorizationToken: authorization.authorizationToken,
        clientId: "qa-other-device-0002",
        clientKind: "mobile",
        contractVersion: 1,
      })
    ).rejects.toThrow("Sign in again to continue")

    await expect(
      client.qaAccelerator.profiles({
        authorizationToken: authorization.authorizationToken,
        clientId: "qa-bound-device-0001",
        clientKind: "web",
        contractVersion: 1,
      })
    ).rejects.toThrow("Sign in again to continue")

    await expect(
      client.qaAccelerator.enterProfile({
        authorizationToken: authorization.authorizationToken,
        clientId: "qa-bound-device-0001",
        clientKind: "mobile",
        contractVersion: 1,
        selectionRef: "0".repeat(64),
      })
    ).rejects.toThrow("You do not have permission")
  })

  test("invalidates a derived web session when its tester credential is revoked", async () => {
    const client = await caller()
    const authorization = await client.qaAccelerator.authorize({
      clientId: "qa-web-browser-0001",
      clientKind: "web",
      contractVersion: 1,
      credential: "valid-local-tester-credential",
      qaDomain: "safa.qa.test",
    })
    const profiles = await client.qaAccelerator.profiles({
      authorizationToken: authorization.authorizationToken,
      clientId: "qa-web-browser-0001",
      clientKind: "web",
      contractVersion: 1,
    })
    const entered = await client.qaAccelerator.enterProfile({
      authorizationToken: authorization.authorizationToken,
      clientId: "qa-web-browser-0001",
      clientKind: "web",
      contractVersion: 1,
      selectionRef: profiles.profiles[1]!.selectionRef,
    })
    expect(entered.clientKind).toBe("web")
    if (entered.clientKind !== "web") return

    const signedSession = await verifySignedSessionToken({
      token: entered.sessionToken,
    })
    expect(signedSession).not.toBeNull()
    if (!signedSession) return
    const headers = new Headers({
      cookie: `${getScopedAuthSessionCookieName(signedSession.scope)}=${entered.sessionToken}; ${getScopedAuthUserCookieName(signedSession.scope)}=${entered.userId}`,
      host: "api.halaalvest.localhost",
    })
    expect((await buildRequestContext(headers)).auth.session?.user.id).toBe(
      entered.userId
    )

    await revokeQaTesterCredential({
      credentialId: "seed-configured-credential",
    })
    expect((await buildRequestContext(headers)).auth.session).toBeNull()
  })
})
