import { expect, test } from "bun:test"
import {
  DEVELOPMENT_FIXED_CODE,
  shouldUseFixedDevelopmentCode,
} from "./development-code-policy"

test("the development code is EwaTrade's six-digit default", () => {
  expect(DEVELOPMENT_FIXED_CODE).toBe("123456")
})

test("fixed codes require an explicit development profile and never a production runtime", () => {
  for (const APP_ENV of ["local", "development", "test"])
    expect(
      shouldUseFixedDevelopmentCode({ APP_ENV, NODE_ENV: "development" })
    ).toBe(true)
  for (const APP_ENV of [
    undefined,
    "",
    "preview",
    "staging",
    "production",
    "Local",
    " local",
  ])
    expect(
      shouldUseFixedDevelopmentCode({ APP_ENV, NODE_ENV: "development" })
    ).toBe(false)
})

test("any production signal fails closed", () => {
  for (const APP_ENV of ["local", "development", "test"]) {
    expect(
      shouldUseFixedDevelopmentCode({ APP_ENV, NODE_ENV: "production" })
    ).toBe(false)
    expect(
      shouldUseFixedDevelopmentCode({
        APP_ENV,
        NODE_ENV: "development",
        VERCEL_ENV: "production",
      })
    ).toBe(false)
  }
  expect(shouldUseFixedDevelopmentCode({})).toBe(false)
})
