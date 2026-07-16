import { describe, expect, test } from "bun:test"
import {
  createEarlyAccessRequestPayload,
  createSignedEarlyAccessRequestToken,
  createSignedSignupApprovalToken,
  createSignupApprovalPayload,
  verifySignedEarlyAccessRequestToken,
  verifySignedSignupApprovalToken,
  type SignupApprovalPayload,
} from "./early-access"

const requestInput = {
  cooperativeName: "Amanah Staff Cooperative",
  message: "We want to launch with 120 members.",
  phone: "+2348012345678",
  primaryContactEmail: "Admin@Example.Test",
  primaryContactFullName: "Amina Bello",
}

describe("early access tokens", () => {
  test("round-trips early access approval payloads", () => {
    const payload = createEarlyAccessRequestPayload(requestInput)
    const token = createSignedEarlyAccessRequestToken(payload)
    const verified = verifySignedEarlyAccessRequestToken(token)

    expect(verified.cooperativeName).toBe(requestInput.cooperativeName)
    expect(verified.primaryContactEmail).toBe("admin@example.test")
    expect(verified.primaryContactFullName).toBe(
      requestInput.primaryContactFullName
    )
  })

  test("round-trips approved setup payloads", () => {
    const requestPayload = createEarlyAccessRequestPayload(requestInput)
    const approvalPayload = createSignupApprovalPayload(requestPayload)
    const token = createSignedSignupApprovalToken(approvalPayload)
    const verified = verifySignedSignupApprovalToken(token)

    expect(verified.kind).toBe("signup_approval")
    expect(verified.cooperativeName).toBe(requestInput.cooperativeName)
    expect(verified.primaryContactEmail).toBe("admin@example.test")
  })

  test("rejects expired signup approval tokens", () => {
    const expiredPayload: SignupApprovalPayload = {
      cooperativeName: requestInput.cooperativeName,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      issuedAt: new Date(Date.now() - 2000).toISOString(),
      kind: "signup_approval",
      primaryContactEmail: "admin@example.test",
      primaryContactFullName: requestInput.primaryContactFullName,
    }
    const token = createSignedSignupApprovalToken(expiredPayload)

    expect(() => verifySignedSignupApprovalToken(token)).toThrow(
      "The approval link has expired."
    )
  })
})
