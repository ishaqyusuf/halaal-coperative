import { describe, expect, test } from "bun:test"
import { assertBuildMatchesSubmission } from "./eas-build-submission-guard"

const projectId = "3fb3e5e2-bd84-4308-8739-e9f4436d0da9"
const buildId = "11111111-1111-4111-8111-111111111111"
const storeQaBuild = {
  id: buildId,
  status: "FINISHED",
  platform: "ANDROID",
  buildProfile: "store-qa",
  channel: "store-qa",
  distribution: "STORE",
  project: { id: projectId },
}

describe("EAS submission build identity", () => {
  test("accepts an exact finished build for the selected store profile", () => {
    expect(() =>
      assertBuildMatchesSubmission(storeQaBuild, {
        buildId,
        platform: "android",
        projectId,
        target: "store-qa",
      })
    ).not.toThrow()
    expect(() =>
      assertBuildMatchesSubmission(
        {
          ...storeQaBuild,
          platform: "IOS",
          buildProfile: "production",
          channel: "production",
        },
        { buildId, platform: "ios", projectId, target: "prod" }
      )
    ).not.toThrow()
  })

  test("rejects validation builds and every mismatched identity field", () => {
    const input = {
      buildId,
      platform: "android",
      projectId,
      target: "store-qa",
    } as const
    for (const candidate of [
      { ...storeQaBuild, buildProfile: "native-validation" },
      { ...storeQaBuild, channel: "native-validation" },
      { ...storeQaBuild, platform: "IOS" },
      { ...storeQaBuild, status: "IN_PROGRESS" },
      { ...storeQaBuild, distribution: "INTERNAL" },
      { ...storeQaBuild, id: "22222222-2222-4222-8222-222222222222" },
      { ...storeQaBuild, project: { id: "another-project" } },
      null,
      {},
    ]) {
      expect(() => assertBuildMatchesSubmission(candidate, input)).toThrow(
        "Selected EAS build is not a finished store-distribution build"
      )
    }
  })
})
