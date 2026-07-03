import { isPrismaMissingTableError } from "../prisma-errors"

export async function readOptionalTenantBusinessPolicy<T>(
  prisma: any,
  read: (delegate: any) => Promise<T>,
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
