import { describe, expect, test } from "bun:test"
import { TRPCError } from "@trpc/server"
import { toQaAccessErrorResponse } from "./qa-access-errors"

describe("QA access error responses", () => {
  test("a refused QA domain is a 401 with a safe message", () => {
    const response = toQaAccessErrorResponse(
      new TRPCError({
        code: "UNAUTHORIZED",
        message: "This domain is not set up for QA on this server.",
      })
    )

    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      error: "qa-not-authorized",
      message: "QA access was not authorized for this domain.",
    })
    expect(JSON.stringify(response.body)).not.toContain("not set up")
  })

  test("maps the other expected refusals to their 4xx", () => {
    expect(
      toQaAccessErrorResponse(new TRPCError({ code: "NOT_FOUND" })).status
    ).toBe(404)
    expect(
      toQaAccessErrorResponse(new TRPCError({ code: "PRECONDITION_FAILED" }))
        .status
    ).toBe(412)
    expect(
      toQaAccessErrorResponse(new TRPCError({ code: "TOO_MANY_REQUESTS" }))
        .status
    ).toBe(429)
    expect(
      toQaAccessErrorResponse(new TRPCError({ code: "BAD_REQUEST" })).status
    ).toBe(400)
  })

  test("unexpected failures stay a generic 500", () => {
    expect(toQaAccessErrorResponse(new Error("db down"))).toEqual({
      body: {
        error: "qa-access-failed",
        message: "QA access could not be checked. Try again.",
      },
      status: 500,
    })
    expect(
      toQaAccessErrorResponse(
        new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "boom" })
      ).status
    ).toBe(500)
  })
})
