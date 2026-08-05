import { describe, expect, it } from "bun:test"
import {
  AppError,
  classifyError,
  getErrorPresentation,
  getPublicError,
  getPublicErrorHttpStatus,
  toPublicError,
} from "."

describe("shared error contract", () => {
  it.each([
    ["P2028", "DATABASE_TRANSACTION_TIMEOUT", true],
    ["P2024", "DATABASE_POOL_TIMEOUT", true],
    ["P2034", "DATABASE_WRITE_CONFLICT", true],
    ["P2002", "CONFLICT", false],
  ] as const)(
    "classifies Prisma %s without exposing the database message",
    (prismaCode, expectedCode, expectedReportable) => {
      const error = Object.assign(new Error("Prisma transaction API error"), {
        code: prismaCode,
        name: "PrismaClientKnownRequestError",
      })

      const classified = classifyError(error)
      expect(classified).toMatchObject({
        code: expectedCode,
        reportable: expectedReportable,
      })
      expect(toPublicError(error).message).not.toContain("Prisma")
    }
  )

  it("preserves a typed domain failure and its original cause", () => {
    const cause = new Error("provider response included private member data")
    const error = new AppError({
      cause,
      code: "PROVIDER_UNAVAILABLE",
      operation: "notifications.deliver",
      publicMessage: "Message delivery is temporarily unavailable.",
      referenceId: "ERR-PROVIDER",
    })

    expect(classifyError(error)).toBe(error)
    expect(error.cause).toBe(cause)
    expect(toPublicError(error)).toEqual({
      action: "retry",
      code: "PROVIDER_UNAVAILABLE",
      message: "Message delivery is temporarily unavailable.",
      referenceId: "ERR-PROVIDER",
      retryable: true,
    })
  })

  it("treats expected tRPC failures as safe and non-reportable", () => {
    const error = Object.assign(
      new Error("Member is not operationally ready"),
      {
        code: "FORBIDDEN",
        name: "TRPCError",
      }
    )

    expect(classifyError(error)).toMatchObject({
      code: "PERMISSION_DENIED",
      reportable: false,
    })
    expect(toPublicError(error).message).toBe(
      "You do not have permission to perform this action."
    )
  })

  it("reads the safe envelope returned by tRPC", () => {
    const appError = {
      action: "sign_in" as const,
      code: "AUTHENTICATION_REQUIRED" as const,
      message: "Sign in again to continue.",
      referenceId: "ERR-AUTH",
      retryable: false,
    }
    const clientError = Object.assign(new Error("UNAUTHORIZED"), {
      data: { appError },
    })

    expect(getPublicError(clientError)).toEqual(appError)
    expect(getPublicError(appError)).toBe(appError)
    expect(getErrorPresentation(appError).reference).toBe("Reference: ERR-AUTH")
  })

  it("uses professional fallback copy and a support reference", () => {
    const error = new Error("member ledger SQL connection exploded")
    const presentation = getErrorPresentation(error, {
      referenceId: "ERR-UNKNOWN",
    })

    expect(presentation).toEqual({
      action: "contact_support",
      description: "Something went wrong. Please try again.",
      reference: "Reference: ERR-UNKNOWN",
      retryable: false,
      title: "Something went wrong",
    })
    expect(getPublicErrorHttpStatus(error)).toBe(500)
  })
})
