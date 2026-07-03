type ErrorLike = {
  cause?: unknown
  code?: unknown
  message?: unknown
  meta?: {
    driverAdapterError?: unknown
  }
  name?: unknown
}

export function isPrismaMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false
  }

  const errorLike = error as ErrorLike

  if (errorLike.code === "P2021") {
    return true
  }

  const message =
    typeof errorLike.message === "string" ? errorLike.message : ""
  const name = typeof errorLike.name === "string" ? errorLike.name : ""

  if (
    name === "TableDoesNotExist" ||
    message.includes("TableDoesNotExist") ||
    message.includes("does not exist in the current database")
  ) {
    return true
  }

  return (
    isPrismaMissingTableError(errorLike.cause) ||
    isPrismaMissingTableError(errorLike.meta?.driverAdapterError)
  )
}
