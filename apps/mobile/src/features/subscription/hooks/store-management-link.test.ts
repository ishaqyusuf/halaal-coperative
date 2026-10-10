import { expect, test } from "bun:test"
import { storeManagementLinkOptions } from "./store-management-link"

test("store management uses the active Android build package", () => {
  expect(
    storeManagementLinkOptions("android", "com.halaalvest.mobile.preview")
  ).toEqual({ packageNameAndroid: "com.halaalvest.mobile.preview" })
  expect(
    storeManagementLinkOptions("android", "com.halaalvest.mobile")
  ).toEqual({ packageNameAndroid: "com.halaalvest.mobile" })
  expect(storeManagementLinkOptions("ios", undefined)).toEqual({})
  expect(() => storeManagementLinkOptions("android", undefined)).toThrow(
    "Android package is unavailable"
  )
})
