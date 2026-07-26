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
  currentSize: "250",
  launchTimeline: "within_30_days",
  message: "We want to launch with 120 members.",
  phone: "+2348012345678",
  primaryContactEmail: "Admin@Example.Test",
  primaryContactFullName: "Amina Bello",
  recordSystem: "spreadsheets",
  setupNeeds: ["member_and_balance_migration", "savings_and_contributions"],
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
    expect(verified.currentSize).toBe(requestInput.currentSize)
    expect(verified.launchTimeline).toBe(requestInput.launchTimeline)
    expect(verified.recordSystem).toBe(requestInput.recordSystem)
    expect(verified.setupNeeds).toEqual(requestInput.setupNeeds)
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

  test("keeps previously issued early access links readable", () => {
    const legacyPayload = createEarlyAccessRequestPayload(requestInput)
    const legacyRecord = legacyPayload as Partial<typeof legacyPayload>

    delete legacyRecord.currentSize
    delete legacyRecord.launchTimeline
    delete legacyRecord.recordSystem
    delete legacyRecord.setupNeeds

    const token = createSignedEarlyAccessRequestToken(legacyPayload)
    const verified = verifySignedEarlyAccessRequestToken(token)

    expect(verified.currentSize).toBe("")
    expect(verified.launchTimeline).toBe("")
    expect(verified.recordSystem).toBe("")
    expect(verified.setupNeeds).toEqual([])
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
