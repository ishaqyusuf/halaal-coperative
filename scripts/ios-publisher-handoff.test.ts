import { describe, expect, test } from "bun:test"
import {
  approvedIosReleaseIdentity,
  iosReleaseIdentity,
} from "../packages/domain/src/modules/ios-release-identity"
import { assertIosEasPublisherHandoff } from "./ios-publisher-handoff"

const eas = {
  submit: {
    "store-qa": {
      ios: {
        appleTeamId: "ZXC78SPCV4",
        ascAppId: "6815838235",
      },
    },
    production: {
      ios: {
        appleTeamId: "ZXC78SPCV4",
        ascAppId: "6815838235",
      },
    },
  },
}

describe("Zeroes Organization iOS release identity", () => {
  test("accepts the owner's exact verified HalaalVest account identity", () => {
    expect(approvedIosReleaseIdentity()).toEqual({
      teamId: "ZXC78SPCV4",
      bundleIdentifier: "com.halaalvest.mobile",
      ascAppId: "6815838235",
    })
    expect(assertIosEasPublisherHandoff(eas, iosReleaseIdentity)).toEqual(
      approvedIosReleaseIdentity()
    )
  })

  test("rejects pending, personal, or any changed verified field", () => {
    for (const changed of [
      { status: "pending" as const },
      { publisher: "personal" as const },
      { teamId: "A1B2C3D4E5" },
      { bundleIdentifier: "com.example.halaalvest" },
      { ascAppId: "1234567890" },
    ]) {
      expect(() =>
        approvedIosReleaseIdentity({ ...iosReleaseIdentity, ...changed })
      ).toThrow("approved Zeroes Organization")
    }
  })

  test("requires matching IDs in both EAS submission profiles", () => {
    for (const profile of ["store-qa", "production"] as const) {
      for (const field of ["appleTeamId", "ascAppId"] as const) {
        const wrong = structuredClone(eas)
        wrong.submit[profile].ios[field] = "wrong"
        expect(() =>
          assertIosEasPublisherHandoff(wrong, iosReleaseIdentity)
        ).toThrow(`iOS ${profile} submission`)
      }
    }
    expect(() => assertIosEasPublisherHandoff({}, iosReleaseIdentity)).toThrow(
      "iOS store-qa submission"
    )
  })
})
