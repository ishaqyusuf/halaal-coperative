import { describe, expect, test } from "bun:test"
import {
  createSignedSignupApprovalToken,
  verifySignedSignupApprovalToken,
  type SignupApprovalPayload,
} from "./early-access"

function approvalPayload(expiresInMs: number): SignupApprovalPayload {
  return {
    cooperativeName: "Amanah Staff Cooperative",
    expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
    issuedAt: new Date(Date.now() - 1000).toISOString(),
    kind: "signup_approval",
    primaryContactEmail: "admin@example.test",
    primaryContactFullName: "Amina Bello",
  }
}

describe("signup approval tokens", () => {
  test("treats a missing production token secret as reportable configuration failure", () => {
    const previousNodeEnvironment = process.env.NODE_ENV
    const previousEarlyAccessSecret = process.env.EARLY_ACCESS_TOKEN_SECRET
    const previousSignupSecret = process.env.SIGNUP_TOKEN_SECRET
    let captured: unknown

    try {
      Reflect.set(process.env, "NODE_ENV", "production")
      Reflect.deleteProperty(process.env, "EARLY_ACCESS_TOKEN_SECRET")
      Reflect.deleteProperty(process.env, "SIGNUP_TOKEN_SECRET")
      verifySignedSignupApprovalToken("body.signature")
    } catch (error) {
      captured = error
    } finally {
      if (previousNodeEnvironment === undefined) {
        Reflect.deleteProperty(process.env, "NODE_ENV")
      } else {
        Reflect.set(process.env, "NODE_ENV", previousNodeEnvironment)
      }
      if (previousEarlyAccessSecret === undefined) {
        Reflect.deleteProperty(process.env, "EARLY_ACCESS_TOKEN_SECRET")
      } else {
        Reflect.set(
          process.env,
          "EARLY_ACCESS_TOKEN_SECRET",
          previousEarlyAccessSecret
        )
      }
      if (previousSignupSecret === undefined) {
        Reflect.deleteProperty(process.env, "SIGNUP_TOKEN_SECRET")
      } else {
        Reflect.set(process.env, "SIGNUP_TOKEN_SECRET", previousSignupSecret)
      }
    }

    expect(captured).toMatchObject({
      code: "PROVIDER_UNAVAILABLE",
      reportable: true,
    })
  })

  test("reads an approval link issued before sign-up opened", () => {
    const token = createSignedSignupApprovalToken(
      approvalPayload(1000 * 60 * 60)
    )
    const verified = verifySignedSignupApprovalToken(token)

    expect(verified.kind).toBe("signup_approval")
    expect(verified.cooperativeName).toBe("Amanah Staff Cooperative")
    expect(verified.primaryContactEmail).toBe("admin@example.test")
  })

  test("rejects a tampered approval link", () => {
    const token = createSignedSignupApprovalToken(
      approvalPayload(1000 * 60 * 60)
    )

    expect(() => verifySignedSignupApprovalToken(`${token}x`)).toThrow(
      "The approval link is invalid."
    )
  })

  test("rejects expired signup approval tokens", () => {
    const token = createSignedSignupApprovalToken(approvalPayload(-1000))

    expect(() => verifySignedSignupApprovalToken(token)).toThrow(
      "The approval link has expired."
    )
  })
})
