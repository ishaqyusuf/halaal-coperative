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
    message.includes("TableDoesNotExist")
  ) {
    return true
  }

  return (
    isPrismaMissingTableError(errorLike.cause) ||
    isPrismaMissingTableError(errorLike.meta?.driverAdapterError)
  )
}

export function isPrismaMissingColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false
  }

  const errorLike = error as ErrorLike

  if (errorLike.code === "P2022") {
    return true
  }

  const message =
    typeof errorLike.message === "string" ? errorLike.message : ""
  const name = typeof errorLike.name === "string" ? errorLike.name : ""

  if (
    name === "ColumnNotFound" ||
    message.includes("ColumnNotFound") ||
    message.includes("The column") ||
    (message.includes("column") && message.includes("does not exist"))
  ) {
    return true
  }

  return (
    isPrismaMissingColumnError(errorLike.cause) ||
    isPrismaMissingColumnError(errorLike.meta?.driverAdapterError)
  )
}
