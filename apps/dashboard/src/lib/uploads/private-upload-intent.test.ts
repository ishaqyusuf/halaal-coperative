import { afterEach, describe, expect, it } from "bun:test"
import { createPrivateUploadIntent, verifyPrivateUploadIntent } from "./private-upload-intent"
import { privateUploadPath } from "./private-blob-storage"

const originalSecret = process.env.DASHBOARD_UPLOAD_SIGNING_SECRET
const id = "843cfde3-1d9f-4d94-9a27-8f3a8ee81072"

afterEach(() => {
  if (originalSecret === undefined) delete process.env.DASHBOARD_UPLOAD_SIGNING_SECRET
  else process.env.DASHBOARD_UPLOAD_SIGNING_SECRET = originalSecret
})

describe("private upload intent", () => {
  it("binds tenant, uploader, purpose and exact private pathname", () => {
    process.env.DASHBOARD_UPLOAD_SIGNING_SECRET = "a-test-only-upload-signing-secret-that-is-long-enough"
    const token = createPrivateUploadIntent({ id, tenantId: "tenant-a", userId: "user-a", purpose: "payment_receipt_proof", expiresAt: Date.now() + 60_000 })
    expect(verifyPrivateUploadIntent(token, "tenant-a", "user-a", privateUploadPath("tenant-a", id)).purpose).toBe("payment_receipt_proof")
    expect(() => verifyPrivateUploadIntent(token, "tenant-b", "user-a")).toThrow()
    expect(() => verifyPrivateUploadIntent(token, "tenant-a", "user-b")).toThrow()
    expect(() => verifyPrivateUploadIntent(token, "tenant-a", "user-a", privateUploadPath("tenant-b", id))).toThrow()
    expect(() => verifyPrivateUploadIntent(`${token}x`, "tenant-a", "user-a")).toThrow()
  })

  it("rejects expired intents", () => {
    process.env.DASHBOARD_UPLOAD_SIGNING_SECRET = "a-test-only-upload-signing-secret-that-is-long-enough"
    const token = createPrivateUploadIntent({ id, tenantId: "tenant-a", userId: "user-a", purpose: "support_attachment", expiresAt: Date.now() - 1 })
    expect(() => verifyPrivateUploadIntent(token, "tenant-a", "user-a")).toThrow()
  })
})
