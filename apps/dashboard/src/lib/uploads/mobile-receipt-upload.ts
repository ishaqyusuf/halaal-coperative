import { createTRPCContext } from "@halaalvest/api/context"
import { appRouter } from "@halaalvest/api/router"
import { readRequestAppAccess } from "@halaalvest/api/trpc"

export const mobileReceiptUploadPurpose = "payment_receipt_proof"

export function isMobileUploadRequest(request: Request) {
  return request.headers.get("x-trpc-source")?.trim().toLowerCase() === "mobile"
}

export function isMobileReceiptProofType(contentType: string) {
  return ["image/jpeg", "image/png", "application/pdf"].includes(contentType)
}

export async function getMobileReceiptUploadActor(request: Request) {
  const ctx = await createTRPCContext({ req: request })
  if (!ctx.request.mobileAuthenticated) return null
  try {
    return await appRouter
      .createCaller(ctx)
      .mobile.member.receipts.uploadAccess()
  } catch {
    return null
  }
}

export async function getMobileReceiptProofReader(request: Request) {
  const ctx = await createTRPCContext({ req: request })
  const { session, activeMembership } = ctx.auth
  const tenant = ctx.tenant.current
  if (
    !ctx.request.mobileAuthenticated ||
    !session ||
    !tenant ||
    tenant.qaPurgeStartedAt ||
    activeMembership?.role !== "member" ||
    activeMembership.tenantId !== tenant.id
  )
    return null

  const actor = { tenantId: tenant.id, userId: session.user.id }
  const access = await readRequestAppAccess(ctx.request, {
    ...actor,
    membershipId: activeMembership.id,
  })
  return access.accessAllowed ? actor : null
}
