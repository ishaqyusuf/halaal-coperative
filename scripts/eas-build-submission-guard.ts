type SubmissionTarget = "store-qa" | "prod"
type SubmissionPlatform = "android" | "ios"

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export function assertBuildMatchesSubmission(
  buildValue: unknown,
  input: {
    buildId: string
    platform: SubmissionPlatform
    projectId: string
    target: SubmissionTarget
  }
) {
  const build = record(buildValue)
  const project = record(build?.project)
  const expectedProfile = input.target === "prod" ? "production" : "store-qa"
  if (
    !build ||
    build.id !== input.buildId ||
    build.status !== "FINISHED" ||
    build.platform !== input.platform.toUpperCase() ||
    build.buildProfile !== expectedProfile ||
    build.channel !== expectedProfile ||
    build.distribution !== "STORE" ||
    project?.id !== input.projectId
  ) {
    throw new Error(
      "Selected EAS build is not a finished store-distribution build for this project, platform and submission profile."
    )
  }
}
