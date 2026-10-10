import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  createSignedSessionToken,
  platformSessionScope,
} from "@halaalvest/auth"
import { buildRequestContext } from "../context"
import { createCallerFactory } from "../lib.trpc"
import { accountPrivacyRouter } from "./account-privacy.route"

describe("privacy API authorization", () => {
  const databaseUrl = process.env.HALAALVEST_DATABASE_URL
  beforeAll(() => {
    delete process.env.HALAALVEST_DATABASE_URL
  })
  afterAll(() => {
    if (databaseUrl) process.env.HALAALVEST_DATABASE_URL = databaseUrl
  })
  async function caller(signedIn = true) {
    const token = signedIn
      ? await createSignedSessionToken({
          membershipId: "membership-amanah-admin-member",
          scope: platformSessionScope,
          tenantId: "tenant-amanah-demo",
          userId: "user-tenant-admin-amanah",
        })
      : null
    const headers = new Headers({ host: "api.halaalvest.localhost" })
    if (token) headers.set("authorization", `Bearer ${token}`)
    return createCallerFactory(accountPrivacyRouter)(
      await buildRequestContext(headers)
    )
  }
  test("rejects unauthenticated notice and record access", async () => {
    const api = await caller(false)
    await expect(api.notice()).rejects.toThrow("signed in")
    await expect(api.list()).rejects.toThrow("signed in")
  })
  test("lets a signed-in member review the notice without paid-plan infrastructure", async () => {
    const notice = await (await caller()).notice()
    expect(notice.version).toMatch(/^notice-sha256-[0-9a-f]{64}$/)
    expect(notice.consequences.join(" ")).toContain(
      "cancelled through the store"
    )
  })
  test("does not let a member read the operator queue or verify identities", async () => {
    const api = await caller()
    await expect(api.operatorQueue({})).rejects.toMatchObject({
      code: "FORBIDDEN",
    })
    await expect(
      api.processingInventory({
        requestId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
    await expect(
      api.recordProcessingNote({
        requestId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        category: "external_processors_backups",
        evidence: "Processor request and outcome evidence recorded.",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
    await expect(
      api.verify({
        requestId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        verificationEvidence: "Identity and scope verified",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
    await expect(
      api.revocationScope({
        requestId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
    await expect(
      api.revokeAccess({
        requestId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        confirmed: true,
        handoverAndRetentionEvidence:
          "Handover and retention review documented by the operator.",
        reviewedMemberships: [
          {
            id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            tenantId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            role: "tenant_admin",
          },
        ],
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
  })
  test("requires the exact notice and explicit confirmation before invoking persistence", async () => {
    const api = await caller()
    await expect(
      api.request({
        idempotencyKey: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        noticeVersion: "old",
        confirmed: false,
      } as never)
    ).rejects.toThrow()
    await expect(
      api.cancel({
        requestId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        userId: "another-user",
      } as never)
    ).rejects.toThrow()
  })
})
