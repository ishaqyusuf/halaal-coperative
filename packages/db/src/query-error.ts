import { AppError, type ErrorCode } from "@halaalvest/errors"

type ExpectedQueryErrorCode = Extract<
  ErrorCode,
  | "CONFLICT"
  | "NOT_FOUND"
  | "PERMISSION_DENIED"
  | "PRECONDITION_FAILED"
  | "VALIDATION_FAILED"
>

/** Marks a deliberately raised, user-correctable database-domain outcome. */
export class ExpectedQueryError extends AppError {
  private constructor(code: ExpectedQueryErrorCode, publicMessage: string) {
    super({
      code,
      internalMessage: publicMessage,
      operation: "database.query",
      publicMessage,
    })
  }

  static conflict(publicMessage: string) {
    return new ExpectedQueryError("CONFLICT", publicMessage)
  }

  static notFound(publicMessage: string) {
    return new ExpectedQueryError("NOT_FOUND", publicMessage)
  }

  static permission(publicMessage: string) {
    return new ExpectedQueryError("PERMISSION_DENIED", publicMessage)
  }

  static precondition(publicMessage: string) {
    return new ExpectedQueryError("PRECONDITION_FAILED", publicMessage)
  }

  static validation(publicMessage: string) {
    return new ExpectedQueryError("VALIDATION_FAILED", publicMessage)
  }
}

/** Marks an explicitly raised database configuration or invariant failure. */
export class QueryInfrastructureError extends AppError {
  constructor(internalMessage: string) {
    super({
      code: "UNEXPECTED",
      internalMessage,
      operation: "database.query",
    })
  }
}
