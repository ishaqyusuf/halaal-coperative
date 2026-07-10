#!/usr/bin/env bun

type DatabaseProfile = "local" | "prod"

type DbPushCliOptions = {
  profile: DatabaseProfile
}

const PROFILE_FLAGS = new Map<string, DatabaseProfile>([
  ["--local", "local"],
  ["--prod", "prod"],
])

export function parseArgs(argv: string[]): DbPushCliOptions {
  let profile: DatabaseProfile = "local"
  let explicitProfile: DatabaseProfile | undefined
  let index = 0

  while (index < argv.length) {
    const arg = argv[index]

    if (!arg) {
      break
    }

    const nextProfile = PROFILE_FLAGS.get(arg)

    if (!nextProfile) {
      throw new Error("Unknown db:push flag: " + arg + ". Use --local or --prod.")
    }

    if (explicitProfile && explicitProfile !== nextProfile) {
      throw new Error(
        "Conflicting db:push flags: --" +
          explicitProfile +
          " and --" +
          nextProfile +
          ". Choose one profile."
      )
    }

    explicitProfile = nextProfile
    profile = nextProfile
    index += 1
  }

  return { profile }
}

export function commandForProfile(profile: DatabaseProfile): string[] {
  switch (profile) {
    case "local":
      return [
        "node",
        "./scripts/with-workspace-env.mjs",
        "HALAALVEST_DEV_PROFILE=local",
        "bun",
        "run",
        "--cwd",
        "packages/db",
        "db:push",
      ]
    case "prod":
      return [
        "node",
        "./scripts/with-workspace-env.mjs",
        "HALAALVEST_ENV=production",
        "HALAALVEST_REQUIRE_PROD_DATABASE_URL=1",
        "bun",
        "run",
        "--cwd",
        "packages/db",
        "db:push",
      ]
  }
}

async function main() {
  const options = parseArgs(Bun.argv.slice(2))
  const child = Bun.spawn(commandForProfile(options.profile), {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  })

  process.exit(await child.exited)
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
