import {
  createAuditLogEntry,
  createPrismaClient,
  disableMobilePushEndpointForProviderFailure,
} from "@halaalvest/db"
import { getExpoMobilePushReceipt } from "@halaalvest/notifications"

export type MobilePushReceiptPayload = {
  notificationId: string
  providerTicketId: string
  registrationId: string
  tenantId: string
}

type MobilePushReceiptDependencies = {
  createAudit: typeof createAuditLogEntry
  disableRegistration: typeof disableMobilePushEndpointForProviderFailure
  getReceipt: typeof getExpoMobilePushReceipt
  prisma: NonNullable<ReturnType<typeof createPrismaClient>>
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function dependencies(
  overrides?: Partial<MobilePushReceiptDependencies>
): MobilePushReceiptDependencies {
  const prisma = overrides?.prisma ?? createPrismaClient()
  if (!prisma) throw new Error("Push receipt requires database configuration.")
  return {
    createAudit: overrides?.createAudit ?? createAuditLogEntry,
    disableRegistration:
      overrides?.disableRegistration ??
      disableMobilePushEndpointForProviderFailure,
    getReceipt: overrides?.getReceipt ?? getExpoMobilePushReceipt,
    prisma,
  }
}

export async function mobilePushReceiptHandler(
  input: MobilePushReceiptPayload,
  overrides?: Partial<MobilePushReceiptDependencies>
) {
  if (!uuidPattern.test(input.notificationId)) {
    throw new Error("notificationId must be a UUID.")
  }
  if (!uuidPattern.test(input.registrationId)) {
    throw new Error("registrationId must be a UUID.")
  }
  const providerTicketId = input.providerTicketId.trim().slice(0, 160)
  if (!providerTicketId) throw new Error("providerTicketId is required.")
  const runtime = dependencies(overrides)
  const receipt = await runtime.getReceipt(providerTicketId)
  if (receipt.status === "pending") {
    throw new Error("The push receipt is not ready.")
  }
  if (
    receipt.status === "error" &&
    receipt.errorCode === "DeviceNotRegistered"
  ) {
    await runtime.disableRegistration(
      {
        failureCode: receipt.errorCode,
        registrationId: input.registrationId,
        tenantId: input.tenantId,
      },
      runtime.prisma
    )
  }
  await runtime.createAudit(
    {
      action:
        receipt.status === "ok"
          ? "mobile.push.receipt_ok"
          : "mobile.push.receipt_failed",
      actorType: "system",
      entityId: input.notificationId,
      entityType: "MobilePushReceipt",
      metadata: {
        errorCode: receipt.errorCode,
        providerTicketId,
        registrationId: input.registrationId,
      },
      tenantId: input.tenantId,
    },
    runtime.prisma
  )
  return {
    errorCode: receipt.errorCode,
    revoked: receipt.errorCode === "DeviceNotRegistered",
    status: receipt.status,
  }
}
