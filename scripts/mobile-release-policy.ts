export function expectedMobileCommit(args: string[], required: boolean) {
  const values = args.flatMap((arg, index) =>
    arg === "--expected-commit"
      ? [args[index + 1] ?? ""]
      : arg.startsWith("--expected-commit=")
        ? [arg.slice("--expected-commit=".length)]
        : []
  )
  if (!required && !values.length) return undefined
  if (values.length !== 1 || !/^[0-9a-f]{40}$/i.test(values[0] ?? ""))
    throw new Error(
      "EAS release requires exactly one full --expected-commit SHA."
    )
  return values[0]!.toLowerCase()
}

export function assertCommittedMobileSource(
  root: string,
  revision: string,
  git = (args: string[]) => {
    const result = Bun.spawnSync(["git", ...args], {
      cwd: root,
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
    })
    if (result.exitCode !== 0)
      throw new Error("Unable to verify mobile release source with Git.")
    return result.stdout.toString().trim()
  }
) {
  if (!/^[0-9a-f]{40}$/i.test(revision))
    throw new Error("Expected commit must be a full SHA.")
  if (git(["rev-parse", "HEAD"]).toLowerCase() !== revision)
    throw new Error(
      "Expected commit must exactly match the current repository HEAD."
    )
  if (git(["status", "--porcelain", "--untracked-files=all"]))
    throw new Error("EAS release requires a clean committed working tree.")
}

export function mobileUpdateCommand(
  target: "preview" | "prod",
  platform: string,
  revision?: string
) {
  if (!["android", "ios", "all"].includes(platform))
    throw new Error("Invalid OTA platform.")
  const environment = target === "prod" ? "production" : "preview"
  return [
    "eas",
    "update",
    "--channel",
    environment,
    "--platform",
    platform,
    "--environment",
    environment,
    "--message",
    revision ? `Release ${revision}` : "Preview working-tree update",
    "--non-interactive",
  ]
}

export function selectedMobileServiceEnvironment(
  selected: Record<string, string | undefined>,
  production: Record<string, string | undefined>,
  target: "preview" | "prod"
) {
  const result: Record<string, string> = {}
  for (const key of [
    "EXPO_PUBLIC_API_URL",
    "EXPO_PUBLIC_DASHBOARD_URL",
    "EXPO_PUBLIC_LEGAL_ORIGIN",
  ]) {
    const value = selected[key]?.trim()
    if (!value)
      throw new Error(
        `${key} must be explicit in the selected mobile environment file.`
      )
    const url = new URL(value)
    if (
      url.protocol !== "https:" ||
      url.origin !== value ||
      url.username ||
      url.password
    )
      throw new Error(`${key} must be an HTTPS origin without a path.`)
    if (
      target === "preview" &&
      key !== "EXPO_PUBLIC_LEGAL_ORIGIN" &&
      production[key] &&
      url.origin === new URL(production[key]!).origin
    )
      throw new Error(`Preview mobile refuses the Production ${key}.`)
    result[key] = value
  }
  return result
}
