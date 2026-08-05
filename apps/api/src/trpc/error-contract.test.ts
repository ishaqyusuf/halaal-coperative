import { describe, expect, it } from "bun:test"
import { AppError } from "@halaalvest/errors"
import { TRPCError } from "@trpc/server"
import { getTrpcPublicError, normalizeTrpcError } from "./error-contract"

describe("tRPC public error contract", () => {
  it("normalizes a typed failure without losing its reference or cause", () => {
    const cause = new Error("provider returned private member details")
    const error = new AppError({
      cause,
      code: "PROVIDER_UNAVAILABLE",
      referenceId: "ERR-TRPC",
    })

    const normalized = normalizeTrpcError(error, "notifications.send")
    expect(normalized.code).toBe("INTERNAL_SERVER_ERROR")
    expect(normalized.message).toBe(
      "A connected service is temporarily unavailable. Please try again."
    )
    expect(normalized.cause).toBe(error)
    expect(getTrpcPublicError(normalized).referenceId).toBe("ERR-TRPC")
  })

  it("preserves approved static workflow guidance", () => {
    const normalized = normalizeTrpcError(
      new TRPCError({
        code: "FORBIDDEN",
        message: "Switch to the member workspace to continue.",
      }),
      "mobile.member.home"
    )

    expect(normalized.message).toBe(
      "Switch to the member workspace to continue."
    )
    expect(getTrpcPublicError(normalized).message).toBe(
      "Switch to the member workspace to continue."
    )
  })

  it("does not preserve technical tRPC messages", () => {
    const normalized = normalizeTrpcError(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Prisma transaction expired for member-1",
      }),
      "mobile.member.home"
    )

    expect(normalized.message).toBe("Something went wrong. Please try again.")
  })
})
