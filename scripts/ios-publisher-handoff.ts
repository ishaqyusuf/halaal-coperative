import { readFile } from "node:fs/promises"
import { approvedIosReleaseIdentity } from "../packages/domain/src/modules/ios-release-identity"

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export function assertIosEasPublisherHandoff(
  easConfig: unknown,
  identity: Parameters<typeof approvedIosReleaseIdentity>[0]
) {
  const approved = approvedIosReleaseIdentity(identity)
  const submit = record(record(easConfig)?.submit)
  for (const profile of ["store-qa", "production"]) {
    const ios = record(record(submit?.[profile])?.ios)
    if (
      ios?.ascAppId !== approved.ascAppId ||
      ios?.appleTeamId !== approved.teamId
    ) {
      throw new Error(
        `iOS ${profile} submission must pin the approved Zeroes Organization Apple team and App Store app IDs.`
      )
    }
  }
  return approved
}

export async function assertLocalIosEasPublisherHandoff(easJsonPath: string) {
  const config = JSON.parse(await readFile(easJsonPath, "utf8")) as unknown
  return assertIosEasPublisherHandoff(config, undefined)
}
