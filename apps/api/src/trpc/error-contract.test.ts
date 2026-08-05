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

  it("preserves bounded readiness guidance", () => {
    const messages = [
      "Member verification is required before financial or operational actions can continue.",
      "This account is not active for the selected cooperative.",
      "This QA workspace is being purged and no longer accepts writes.",
      "The QA purge preview expired or changed. Preview again.",
      "There are no marked QA workspaces to purge.",
    ]

    for (const message of messages) {
      expect(
        normalizeTrpcError(
          new TRPCError({ code: "CONFLICT", message }),
          "member.readiness"
        ).message
      ).toBe(message)
    }
  })

  it("preserves precondition semantics and QA recovery guidance", () => {
    const normalized = normalizeTrpcError(
      new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Resolve all live provider blockers before purging QA data.",
      }),
      "qaMaintenance.startPurge"
    )

    expect(normalized.code).toBe("PRECONDITION_FAILED")
    expect(normalized.message).toBe(
      "Resolve all live provider blockers before purging QA data."
    )
    expect(getTrpcPublicError(normalized).code).toBe("PRECONDITION_FAILED")
  })
})
