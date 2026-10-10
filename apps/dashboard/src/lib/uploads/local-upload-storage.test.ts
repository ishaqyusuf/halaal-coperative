import { afterEach, describe, expect, it } from "bun:test"
import { saveDashboardUpload } from "./local-upload-storage"

const originalVercel = process.env.VERCEL
const originalVercelEnv = process.env.VERCEL_ENV
const originalNodeEnv = process.env.NODE_ENV

afterEach(() => {
  if (originalVercel === undefined) delete process.env.VERCEL
  else process.env.VERCEL = originalVercel
  if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV
  else process.env.VERCEL_ENV = originalVercelEnv
  if (originalNodeEnv === undefined) Reflect.deleteProperty(process.env, "NODE_ENV")
  else Reflect.set(process.env, "NODE_ENV", originalNodeEnv)
})

describe("dashboard upload storage", () => {
  it("rejects an upload before writing to a Vercel function filesystem", async () => {
    process.env.VERCEL = "1"
    const file = new File(["private proof"], "proof.txt", { type: "text/plain" })
    await expect(saveDashboardUpload({
      file,
      purpose: "payment_receipt_proof",
      tenantId: "tenant-1",
      userId: "user-1",
    })).rejects.toThrow("persistent storage is configured")
  })

  it("rejects local storage in production even without Vercel system variables", async () => {
    delete process.env.VERCEL
    delete process.env.VERCEL_ENV
    Reflect.set(process.env, "NODE_ENV", "production")
    const file = new File(["private proof"], "proof.txt", { type: "text/plain" })
    await expect(saveDashboardUpload({
      file,
      purpose: "payment_receipt_proof",
      tenantId: "tenant-1",
      userId: "user-1",
    })).rejects.toThrow("persistent storage is configured")
  })

  it("rejects a file above the 10 MB allowance before writing", async () => {
    delete process.env.VERCEL
    delete process.env.VERCEL_ENV
    Reflect.set(process.env, "NODE_ENV", "test")
    const file = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "proof.pdf", { type: "application/pdf" })
    await expect(saveDashboardUpload({
      file,
      purpose: "payment_receipt_proof",
      tenantId: "tenant-1",
      userId: "user-1",
    })).rejects.toThrow("larger than 10 MB")
  })
})
