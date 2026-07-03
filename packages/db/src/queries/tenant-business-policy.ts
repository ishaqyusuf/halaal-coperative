import type { PrismaClient } from "../../generated/prisma/client"
import { isPrismaMissingTableError } from "../prisma-errors"

type TenantBusinessPolicyDelegate = PrismaClient["tenantBusinessPolicy"]

export async function readOptionalTenantBusinessPolicy<T>(
  prisma:
    | {
        tenantBusinessPolicy?: TenantBusinessPolicyDelegate
      }
    | null
    | undefined,
  read: (delegate: TenantBusinessPolicyDelegate) => Promise<T>,
): Promise<T | null> {
  const delegate = prisma?.tenantBusinessPolicy

  if (!delegate || typeof delegate.findUnique !== "function") {
    return null
  }

  try {
    return await read(delegate)
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      return null
    }

    throw error
  }
}
