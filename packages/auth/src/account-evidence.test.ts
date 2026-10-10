import { describe, expect, test } from "bun:test"
import {
  createAuthEvidenceCode,
  createAuthEvidenceToken,
  createMemberSignupLinkToken,
  createSignedSessionTokenBundle,
  hashAuthEvidence,
  hashAuthRateLimitSignal,
  verifyMemberSignupLinkToken,
  verifySignedSessionToken,
} from "./index"

describe("account evidence", () => {
  test("creates fixed-width OTP evidence and opaque completion tokens", () => {
    expect(createAuthEvidenceCode()).toMatch(/^\d{6}$/)
    expect(createAuthEvidenceToken().length).toBeGreaterThanOrEqual(40)
  })

  test("uses stable keyed hashes without retaining raw identifiers", () => {
    const email = "member@example.test"
    const hash = hashAuthRateLimitSignal(email)
    expect(hash).toHaveLength(64)
    expect(hash).not.toContain(email)
    expect(hash).toBe(hashAuthRateLimitSignal(email.toUpperCase()))
    expect(hashAuthEvidence("123456")).not.toBe(hashAuthEvidence("654321"))
  })

  test("signs signup invitations and exposes tenant binding for callers", () => {
    const token = createMemberSignupLinkToken({
      linkId: "11111111-1111-4111-8111-111111111111",
      tenantId: "22222222-2222-4222-8222-222222222222",
      tokenVersion: 3,
    })
    expect(verifyMemberSignupLinkToken(token)).toEqual({
      linkId: "11111111-1111-4111-8111-111111111111",
      tenantId: "22222222-2222-4222-8222-222222222222",
      tokenVersion: 3,
    })
    expect(() => verifyMemberSignupLinkToken(`${token}tampered`)).toThrow()
  })

  test("signs explicit expiring mobile-session payloads", async () => {
    const expiresAt = Date.now() + 60_000
    const bundle = await createSignedSessionTokenBundle({
      expiresAt,
      membershipId: "membership-1",
      nonce: "mobile-session-1",
      scope: "platform",
      sessionKind: "mobile",
      tenantId: "tenant-1",
      userId: "user-1",
    })

    expect(bundle.payload).toMatchObject({
      expiresAt,
      membershipId: "membership-1",
      nonce: "mobile-session-1",
      sessionKind: "mobile",
      tenantId: "tenant-1",
      userId: "user-1",
    })
    await expect(
      verifySignedSessionToken({ token: bundle.token })
    ).resolves.toEqual(bundle.payload)
  })
})
