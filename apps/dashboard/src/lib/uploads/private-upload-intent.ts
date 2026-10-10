import { createHmac, timingSafeEqual } from "node:crypto"
import { isSupportedDashboardUploadPurpose, type DashboardUploadPurpose } from "./upload-policy"
import { privateUploadPath } from "./private-blob-storage"

type Intent = { id: string; tenantId: string; userId: string; purpose: DashboardUploadPurpose; expiresAt: number }

function signature(value: string) {
  const secret = process.env.DASHBOARD_UPLOAD_SIGNING_SECRET
  if (!secret || secret.length < 32) throw new Error("Upload signing is not configured.")
  return createHmac("sha256", secret).update(value).digest("base64url")
}

export function createPrivateUploadIntent(intent: Intent) {
  const encoded = Buffer.from(JSON.stringify(intent)).toString("base64url")
  return `${encoded}.${signature(encoded)}`
}

export function verifyPrivateUploadIntent(token: string, tenantId: string, userId: string, pathname?: string) {
  const [encoded, provided, extra] = token.split(".")
  if (!encoded || !provided || extra) throw new Error("Invalid upload intent.")
  const expected = Buffer.from(signature(encoded))
  const actual = Buffer.from(provided)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new Error("Invalid upload intent.")
  let intent: Intent
  try { intent = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) } catch { throw new Error("Invalid upload intent.") }
  if (intent.tenantId !== tenantId || intent.userId !== userId ||
      !Number.isSafeInteger(intent.expiresAt) || intent.expiresAt < Date.now() ||
      !isSupportedDashboardUploadPurpose(intent.purpose) ||
      (pathname && privateUploadPath(intent.tenantId, intent.id) !== pathname)) {
    throw new Error("Upload intent is expired or does not match the account.")
  }
  privateUploadPath(intent.tenantId, intent.id)
  return intent
}
