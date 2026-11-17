import {
  issueSignedToken,
  parseStoreIdFromDelegationToken,
  presignUrl,
} from "@vercel/blob"
import { getPendingDashboardEvidenceUpload } from "@halaalvest/db"
import {
  getMobileReceiptUploadActor,
  mobileReceiptUploadPurpose,
} from "@/lib/uploads/mobile-receipt-upload"
import { privateUploadPath } from "@/lib/uploads/private-blob-storage"
import { verifyPrivateUploadIntent } from "@/lib/uploads/private-upload-intent"
import { isPrivateDashboardUploadEnabled } from "@/lib/uploads/upload-policy"

export const runtime = "nodejs"

export async function POST(request: Request) {
  if (!isPrivateDashboardUploadEnabled()) {
    return Response.json(
      { error: "Private uploads are unavailable." },
      { status: 503 }
    )
  }

  try {
    const actor = await getMobileReceiptUploadActor(request)
    if (!actor) return Response.json({ error: "Unauthorized" }, { status: 403 })
    const { intent } = await request.json()
    if (typeof intent !== "string" || intent.length > 2048) {
      return Response.json({ error: "Invalid upload intent." }, { status: 400 })
    }

    const claims = verifyPrivateUploadIntent(
      intent,
      actor.tenantId,
      actor.userId
    )
    if (claims.purpose !== mobileReceiptUploadPurpose)
      throw new Error("Invalid upload purpose.")
    const record = await getPendingDashboardEvidenceUpload({
      id: claims.id,
      tenantId: actor.tenantId,
      uploaderUserId: actor.userId,
      purpose: mobileReceiptUploadPurpose,
    })
    if (!record) throw new Error("Upload intent is no longer active.")

    const pathname = privateUploadPath(actor.tenantId, claims.id)
    const constraints = {
      pathname,
      allowedContentTypes: [record.contentType],
      maximumSizeInBytes: record.declaredSize,
      validUntil: Math.min(claims.expiresAt, Date.now() + 5 * 60 * 1000),
    }
    const token = await issueSignedToken({
      ...constraints,
      operations: ["put"],
      abortSignal: AbortSignal.timeout(10_000),
    })
    const { presignedUrl } = await presignUrl(token, {
      ...constraints,
      access: "private",
      operation: "put",
      addRandomSuffix: false,
      allowOverwrite: false,
    })
    return Response.json(
      {
        url: presignedUrl,
        headers: {
          "x-api-version": process.env.VERCEL_BLOB_API_VERSION_OVERRIDE ?? "12",
          "x-vercel-blob-store-id": parseStoreIdFromDelegationToken(
            token.delegationToken
          ),
          "x-vercel-blob-access": "private",
          "x-content-type": record.contentType,
          "content-type": record.contentType,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } }
    )
  } catch {
    return Response.json(
      { error: "Upload authorization failed." },
      { status: 403 }
    )
  }
}
