import {
  assertPreviewPublisherReady,
  runPreviewBuildAndPublish,
} from "./release-app-update"
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { inspectPublicPages } from "./public-pages-preflight"
import { assertBuildMatchesSubmission } from "./eas-build-submission-guard"
import { inspectEasAndroidArtifact } from "./eas-android-artifact-preflight"
import { inspectEasIosArtifact } from "./eas-ios-artifact-preflight"
import { assertLaunchSourcePresent } from "./release-source-preflight"
import { assertForwardedEasArgs } from "./eas-runner-arguments"
import { assertLocalIosEasPublisherHandoff } from "./ios-publisher-handoff"
import {
  expectedMobileCommit,
  assertCommittedMobileSource,
  mobileUpdateCommand,
  selectedMobileServiceEnvironment,
} from "./mobile-release-policy"

type Operation = "build" | "submit" | "update"
type Target = "dev" | "preview" | "store-qa" | "prod"
type BuildPlatform = "android" | "ios"
type Action =
  | "auth"
  | "build:dev"
  | "build:preview"
  | "build:store-qa"
  | "build:prod"
  | "submit:store-qa"
  | "submit:prod"
  | "update:preview"
  | "update:prod"

type EasAccount = {
  label: string
  login: string
  password: string
  username: string | null
}

const REPO_DIR = path.join(import.meta.dir, "..")
const APP_DIR = path.join(REPO_DIR, "apps", "mobile")

const TARGET_PROFILES: Record<Target, string> = {
  dev: "development",
  preview: "preview",
  "store-qa": "store-qa",
  prod: "production",
}

const TARGET_ENV_FILES: Record<Target, string> = {
  dev: ".env.dev",
  preview: ".env.preview",
  "store-qa": ".env.preview",
  prod: ".env.production",
}

const requestedOperation = process.argv[2]
const actionArgs = process.argv.slice(3)

if (requestedOperation === "auth") {
  await authenticateSharedSession(actionArgs)
  process.exit(0)
}
const operation = requestedOperation as Operation | undefined
if (!operation || !["build", "submit", "update"].includes(operation)) {
  console.error(getUsage())
  process.exit(1)
}

const target = resolveTarget(operation, actionArgs)
const buildPlatform = resolveBuildPlatform(operation, actionArgs)
const expectedCommit = expectedMobileCommit(
  actionArgs,
  (operation === "build" && (target === "preview" || target === "prod")) ||
    (operation === "update" && target === "prod")
)
if (expectedCommit) assertCommittedMobileSource(REPO_DIR, expectedCommit)
const submissionBuildId =
  operation === "submit" ? assertExactSubmissionBuildId(actionArgs) : null
const forwardedArgs = getForwardedArgs(actionArgs)
assertForwardedEasArgs(operation, forwardedArgs)
const validationEndpoints = actionArgs.includes("--validation-endpoints")
if (
  validationEndpoints &&
  (operation !== "build" ||
    target !== "store-qa" ||
    buildPlatform !== "android")
) {
  throw new Error(
    "--validation-endpoints applies only to store-qa Android builds."
  )
}
if (
  validationEndpoints &&
  forwardedArgs.some(
    (arg) =>
      arg !== "--non-interactive" && arg !== "--no-wait" && arg !== "--local"
  )
) {
  throw new Error(
    "Validation builds accept only --non-interactive, --no-wait and --local."
  )
}
if (
  (operation === "build" || operation === "submit") &&
  buildPlatform === "ios" &&
  (target === "store-qa" || target === "prod")
) {
  await assertLocalIosEasPublisherHandoff(path.join(APP_DIR, "eas.json"))
}
if (target === "store-qa" || target === "prod") {
  await assertLaunchSourcePresent(REPO_DIR)
}
const action = `${operation}:${target}` as Action
const targetEnvFile = TARGET_ENV_FILES[target]
const env = await loadEnvFiles({ ...Bun.env }, [
  path.join(REPO_DIR, ".env"),
  path.join(REPO_DIR, targetEnvFile),
  ...(target === "dev"
    ? [path.join(APP_DIR, ".env"), path.join(APP_DIR, targetEnvFile)]
    : []),
])
if (
  (target === "preview" || target === "prod") &&
  (operation === "build" || operation === "update")
) {
  Object.assign(
    env,
    selectedMobileServiceEnvironment(
      await loadEnvFiles({}, [path.join(REPO_DIR, targetEnvFile)]),
      await loadEnvFiles({}, [path.join(REPO_DIR, ".env.production")]),
      target
    )
  )
}
if (target === "store-qa") {
  if (validationEndpoints) {
    // A signed native/manifest probe must never connect to a real backend.
    env.EXPO_PUBLIC_API_URL = "https://api.validation.invalid"
    env.EXPO_PUBLIC_DASHBOARD_URL = "https://dashboard.validation.invalid"
    console.log(
      "Using unreachable validation API/dashboard origins for this Android build."
    )
  } else {
    const previewUrls = await loadEnvFiles({}, [
      path.join(REPO_DIR, ".env.preview"),
      path.join(APP_DIR, ".env.preview"),
    ])
    for (const key of [
      "EXPO_PUBLIC_API_URL",
      "EXPO_PUBLIC_DASHBOARD_URL",
      "EXPO_PUBLIC_LEGAL_ORIGIN",
    ] as const) {
      const value = previewUrls[key]?.trim()
      if (!value)
        throw new Error(
          `${key} must be set in a preview-specific env file for store-qa builds.`
        )
      env[key] = value
    }
  }
}
if (operation === "submit" && target === "prod") {
  const legalOrigin = env.EXPO_PUBLIC_LEGAL_ORIGIN?.trim()
  if (!legalOrigin)
    throw new Error("Production submission requires EXPO_PUBLIC_LEGAL_ORIGIN.")
  const publicPages = await inspectPublicPages(legalOrigin)
  if (!publicPages.ready) {
    const failures = publicPages.checks
      .filter((check) => !check.ready)
      .map((check) => `${check.path}:${check.reason}`)
    throw new Error(
      `Production submission blocked by public-page preflight: ${failures.join(", ")}`
    )
  }
  console.log("Production public pages and legal bundle passed preflight.")
}
const appVariant =
  target === "store-qa" ? "production" : TARGET_PROFILES[target]
env.APP_VARIANT = appVariant
env.EXPO_PUBLIC_APP_VARIANT = appVariant
env.APP_ENV =
  target === "prod" ? "production" : target === "store-qa" ? "preview" : target
env.EXPO_NO_DOTENV = "1"
// The inspected no-VCS monorepo archive includes all build inputs without
// attaching repository history, local database backups, or generated native trees.
// Release builds retain Git metadata so provider builds identify the exact SHA.
if (operation === "build" && !expectedCommit) env.EAS_NO_VCS = "1"
else delete env.EAS_NO_VCS
delete env.EXPO_TOKEN

const account = resolveAccount(action, env, actionArgs)

const isolatedHome = await mkdtemp(path.join(tmpdir(), "halaalvest-eas-"))
let exitCode = 1

try {
  // EAS reads its auth state from $HOME/.expo/state.json. Keep this login
  // private to the command instead of replacing the user's shared Expo session.
  env.HOME = isolatedHome
  delete env.EXPO_LOCAL
  delete env.EXPO_STAGING
  const session = await loginWithEmailAndPassword(
    account.login,
    account.password
  )
  await writeExpoSession(isolatedHome, session)
  for (const key of Object.keys(env)) {
    if (/^EAS(?:_[A-Z0-9]+)*_(?:PASSWORD|EMAIL|LOGIN)$/.test(key)) {
      delete env[key]
    }
  }
  console.log(`Authenticated isolated EAS session as ${session.username}.`)

  if (operation === "submit" && submissionBuildId) {
    const build = await readEasBuild(submissionBuildId, env)
    assertBuildMatchesSubmission(build, {
      buildId: submissionBuildId,
      platform: buildPlatform as BuildPlatform,
      projectId:
        env.HALAALVEST_EXPO_PROJECT_ID?.trim() ||
        env.EXPO_PROJECT_ID?.trim() ||
        env.EAS_PROJECT_ID?.trim() ||
        "3fb3e5e2-bd84-4308-8739-e9f4436d0da9",
      target: target as "store-qa" | "prod",
    })
    console.log("Exact EAS build identity passed submission preflight.")
    if (buildPlatform === "android") {
      const apiUrl = env.EXPO_PUBLIC_API_URL?.trim()
      const dashboardUrl = env.EXPO_PUBLIC_DASHBOARD_URL?.trim()
      const legalOrigin = env.EXPO_PUBLIC_LEGAL_ORIGIN?.trim()
      if (!apiUrl || !dashboardUrl || !legalOrigin)
        throw new Error(
          "Android submission requires reviewed service and legal origins."
        )
      const digest = await inspectEasAndroidArtifact(build, {
        apiUrl,
        dashboardUrl,
        legalOrigin,
        path: path.join(isolatedHome, "submission-candidate.aab"),
      })
      console.log(
        `Exact Android AAB origin and identity check passed (SHA-256 ${digest}).`
      )
    } else {
      const digest = await inspectEasIosArtifact(
        build,
        path.join(isolatedHome, "submission-candidate.ipa")
      )
      console.log(
        `Exact iOS IPA identity and app-owned privacy check passed (SHA-256 ${digest}).`
      )
    }
  }

  if (expectedCommit) assertCommittedMobileSource(REPO_DIR, expectedCommit)
  const command = [
    ...getActionCommand(operation, target, buildPlatform),
    ...forwardedArgs,
  ]
  if (
    operation === "build" &&
    target === "preview" &&
    buildPlatform === "android"
  ) {
    await assertPreviewPublisherReady(REPO_DIR, forwardedArgs)
    exitCode = await runPreviewBuildAndPublish({
      command,
      root: REPO_DIR,
      expectedCommit: expectedCommit!,
      runJson: async (cmd) => {
        const child = Bun.spawn({
          cmd,
          cwd: APP_DIR,
          env,
          stdout: "pipe",
          stderr: "inherit",
        })
        const output = await new Response(child.stdout).text()
        return { code: await child.exited, output }
      },
    })
  } else {
    exitCode = await runCommand(command, {
      cwd: APP_DIR,
      env,
      stdio: "inherit",
    })
  }
} finally {
  await rm(isolatedHome, { recursive: true, force: true })
}

process.exitCode = exitCode

function resolveAccount(
  actionValue: Action,
  sourceEnv: NodeJS.ProcessEnv,
  args: string[]
): EasAccount {
  const selectedAccount = getAccountSelector(args, sourceEnv)
  const actionPrefix = toEnvKey(actionValue)
  const target =
    actionValue === "auth" ? null : (actionValue.split(":")[1] as Target)
  const targetPrefix = target ? toEnvKey(target) : null
  const profilePrefix = target ? toEnvKey(TARGET_PROFILES[target]) : null
  const selectedPrefix = selectedAccount ? toEnvKey(selectedAccount) : null
  const prefixes = selectedPrefix
    ? [`EAS_${selectedPrefix}`]
    : [
        ...new Set([
          `EAS_${actionPrefix}`,
          ...(targetPrefix
            ? [`EAS_${targetPrefix}`, `EAS_${profilePrefix}`]
            : []),
          "EAS",
        ]),
      ]

  const login =
    getFirstEnv(
      sourceEnv,
      prefixes.flatMap((prefix) => [`${prefix}_EMAIL`, `${prefix}_LOGIN`])
    ) ?? null
  const password = getFirstEnv(
    sourceEnv,
    prefixes.map((prefix) => `${prefix}_PASSWORD`)
  )
  const username =
    getFirstEnv(
      sourceEnv,
      prefixes.map((prefix) => `${prefix}_USERNAME`)
    ) ?? null

  if (!login || !password) {
    console.error(
      [
        `Missing EAS credentials for ${selectedAccount ?? actionValue}.`,
        "",
        "Set EAS_EMAIL/EAS_PASSWORD, or choose a named account with:",
        "  EAS_ACCOUNT=work EAS_WORK_EMAIL=... EAS_WORK_PASSWORD=...",
        `  bun run eas:${actionValue.split(":")[0]} --${target} --account work`,
      ].join("\n")
    )
    process.exit(1)
  }

  return {
    label: username ?? login,
    login,
    password,
    username,
  }
}

function resolveTarget(operation: Operation, args: string[]): Target {
  const selectedFlags = args.filter((arg) =>
    ["--dev", "--preview", "--store-qa", "--prod"].includes(arg)
  )

  if (selectedFlags.length !== 1) {
    console.error("Choose exactly one EAS environment flag.\n")
    console.error(getUsage())
    process.exit(1)
  }

  const target = selectedFlags[0].slice(2) as Target

  if (operation === "update" && (target === "dev" || target === "store-qa")) {
    console.error("eas:update supports only --preview or --prod.\n")
    console.error(getUsage())
    process.exit(1)
  }

  if (operation === "submit" && target !== "store-qa" && target !== "prod") {
    console.error("eas:submit supports only --store-qa or --prod.\n")
    console.error(getUsage())
    process.exit(1)
  }

  return target
}

function getActionCommand(
  operation: Operation,
  target: Target,
  platform: BuildPlatform | "all"
): string[] {
  if (operation === "build") {
    return [
      "eas",
      "build",
      "--platform",
      platform,
      "--profile",
      validationEndpoints ? "native-validation" : TARGET_PROFILES[target],
    ]
  }

  if (operation === "submit") {
    return [
      "eas",
      "submit",
      "--platform",
      platform,
      "--profile",
      TARGET_PROFILES[target],
    ]
  }

  return mobileUpdateCommand(
    target as "preview" | "prod",
    platform,
    expectedCommit
  )
}

function resolveBuildPlatform(
  operation: Operation,
  args: string[]
): BuildPlatform | "all" {
  const selections: string[] = []
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === "--platform") {
      selections.push(args[++index] ?? "")
    } else if (arg.startsWith("--platform=")) {
      selections.push(arg.slice("--platform=".length))
    }
  }
  if (selections.length > 1) {
    throw new Error("Choose one EAS build platform.")
  }
  const selected = selections[0]
  if (
    selected !== undefined &&
    selected !== "android" &&
    selected !== "ios" &&
    !(operation === "update" && selected === "all")
  ) {
    throw new Error(
      "EAS platform must be android or ios; update also accepts all."
    )
  }
  if (operation === "submit" && selected === undefined) {
    throw new Error("EAS submission requires --platform android or ios.")
  }
  return selected ?? "android"
}

function assertExactSubmissionBuildId(args: string[]): string {
  if (
    args.some(
      (arg) =>
        arg === "--profile" ||
        arg === "-e" ||
        arg.startsWith("--profile=") ||
        arg.startsWith("-e=")
    )
  ) {
    throw new Error(
      "Submission profile is selected by --store-qa or --prod; do not override it."
    )
  }
  const choices = args.filter(
    (arg) =>
      ["--id", "--latest", "--path", "--url"].includes(arg) ||
      ["--id=", "--latest=", "--path=", "--url="].some((prefix) =>
        arg.startsWith(prefix)
      )
  )
  const idIndex = args.indexOf("--id")
  const id =
    idIndex >= 0
      ? args[idIndex + 1]
      : args.find((arg) => arg.startsWith("--id="))?.slice("--id=".length)
  if (
    choices.length !== 1 ||
    !id ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    throw new Error(
      "EAS submission requires one exact --id <build-uuid>; latest, path and URL selection are disabled."
    )
  }
  return id
}

async function readEasBuild(buildId: string, env: NodeJS.ProcessEnv) {
  const proc = Bun.spawn({
    cmd: ["eas", "build:view", buildId, "--json"],
    cwd: APP_DIR,
    env,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  })
  const [stdout, , exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  if (exitCode !== 0)
    throw new Error("Unable to inspect the exact EAS build before submission.")
  try {
    return JSON.parse(stdout) as unknown
  } catch {
    throw new Error("EAS build inspection returned invalid JSON.")
  }
}

function getAccountSelector(
  args: string[],
  sourceEnv: NodeJS.ProcessEnv
): string | null {
  const accountFlagIndex = args.findIndex(
    (arg) => arg === "--account" || arg === "-a"
  )
  const accountEquals = args.find((arg) => arg.startsWith("--account="))

  if (accountFlagIndex >= 0) {
    return args[accountFlagIndex + 1]?.trim() || null
  }

  if (accountEquals) {
    return accountEquals.split("=").slice(1).join("=").trim() || null
  }

  return sourceEnv.EAS_ACCOUNT?.trim() || null
}

function getForwardedArgs(args: string[]): string[] {
  const forwardedArgs: string[] = []

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (arg === "--account" || arg === "-a") {
      index += 1
      continue
    }

    if (arg.startsWith("--account=")) {
      continue
    }

    if (["--dev", "--preview", "--store-qa", "--prod"].includes(arg)) {
      continue
    }

    if (arg === "--validation-endpoints") {
      continue
    }

    if (arg === "--platform") {
      index += 1
      continue
    }

    if (arg.startsWith("--platform=")) {
      continue
    }
    if (arg === "--expected-commit") {
      index += 1
      continue
    }
    if (arg.startsWith("--expected-commit=")) continue

    forwardedArgs.push(arg)
  }

  return forwardedArgs
}

function getFirstEnv(
  sourceEnv: NodeJS.ProcessEnv,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = sourceEnv[key]?.trim()

    if (value) {
      return value
    }
  }
}

function toEnvKey(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase()
}

function getUsage(): string {
  return [
    "Usage:",
    "  bun run eas:auth [--account <name>]",
    "  bun run eas:build <--dev|--preview|--store-qa|--prod> [--platform android|ios] [--account <name>] [--validation-endpoints for store-qa Android]",
    "  bun run eas:submit <--store-qa|--prod> --platform <android|ios> --id <build-uuid> [--account <name>]",
    "  bun run eas:update <--preview|--prod> [--platform android|ios|all] [--expected-commit <full-sha>] [--account <name>]",
    "  Preview/Production release builds and Production OTA require --expected-commit <full-sha>.",
    "",
    "Default credentials:",
    "  EAS_EMAIL or EAS_LOGIN",
    "  EAS_PASSWORD",
    "  EAS_USERNAME optional",
    "",
    "Named account credentials:",
    "  EAS_ACCOUNT=work",
    "  EAS_WORK_EMAIL or EAS_WORK_LOGIN",
    "  EAS_WORK_PASSWORD",
    "  EAS_WORK_USERNAME optional",
  ].join("\n")
}

// The shared release planner reads EAS through its global session. As in
// EwaTrade, only auth switches that session; build/update/submit stay isolated.
async function authenticateSharedSession(args: string[]) {
  if (
    args.some(
      (arg, index) =>
        arg !== "--account" &&
        arg !== "-a" &&
        !arg.startsWith("--account=") &&
        args[index - 1] !== "--account" &&
        args[index - 1] !== "-a"
    )
  )
    throw new Error("eas:auth accepts only --account <name>.")
  const sourceEnv = await loadEnvFiles({ ...Bun.env }, [
    path.join(REPO_DIR, ".env"),
  ])
  const account = resolveAccount("auth", sourceEnv, args)
  const userHome = Bun.env.HOME
  if (!userHome) throw new Error("HOME is not set; EAS session has no path.")
  const statePath = path.join(userHome, ".expo", "state.json")
  let state: Record<string, unknown> = {}
  try {
    state = JSON.parse(await readFile(statePath, "utf8"))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
  }
  const current = (state.auth as { username?: string } | undefined)?.username
  if (
    current &&
    account.username &&
    current.toLowerCase() === account.username.toLowerCase()
  ) {
    console.log(`EAS session already matches ${current}.`)
    return
  }
  const session = await loginWithEmailAndPassword(
    account.login,
    account.password
  )
  state.auth = {
    sessionSecret: session.sessionSecret,
    userId: session.id,
    username: session.username,
    currentConnection: "Username-Password-Authentication",
  }
  await mkdir(path.dirname(statePath), { recursive: true })
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  })
  console.log(`Authenticated the shared EAS session as ${session.username}.`)
}

async function loadEnvFiles(
  baseEnv: NodeJS.ProcessEnv,
  envFilePaths: string[]
): Promise<NodeJS.ProcessEnv> {
  const env = { ...baseEnv }

  for (const envFilePath of envFilePaths) {
    let source: string

    try {
      source = await readFile(envFilePath, "utf8")
    } catch (error) {
      const isMissingFile =
        error instanceof Error &&
        "code" in error &&
        (error as NodeJS.ErrnoException).code === "ENOENT"

      if (isMissingFile) {
        continue
      }

      throw error
    }

    Object.assign(env, parseEnvFile(source))
  }

  return env
}

function parseEnvFile(source: string): Record<string, string> {
  const values: Record<string, string> = {}

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim()

    if (!line || line.startsWith("#")) {
      continue
    }

    const withoutExport = line.startsWith("export ")
      ? line.slice(7).trimStart()
      : line
    const separatorIndex = withoutExport.indexOf("=")

    if (separatorIndex <= 0) {
      continue
    }

    const key = withoutExport.slice(0, separatorIndex).trim()

    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      continue
    }

    values[key] = unquoteEnvValue(
      withoutExport.slice(separatorIndex + 1).trim()
    )
  }

  return values
}

function unquoteEnvValue(value: string): string {
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\n/g, "\n").replace(/\\"/g, '"')
  }

  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1)
  }

  const commentIndex = value.search(/\s#/)
  return commentIndex >= 0 ? value.slice(0, commentIndex).trimEnd() : value
}

async function loginWithEmailAndPassword(
  emailValue: string,
  passwordValue: string
) {
  const easCliRoot = await resolveEasCliRoot()
  const modulePath = path.join(
    easCliRoot,
    "build",
    "user",
    "fetchSessionSecretAndUser.js"
  )

  const module = (await import(pathToFileURL(modulePath).href)) as {
    fetchSessionSecretAndUserAsync: (input: {
      username: string
      password: string
      otp?: string
    }) => Promise<{ sessionSecret: string; id: string; username: string }>
  }

  return await module.fetchSessionSecretAndUserAsync({
    username: emailValue,
    password: passwordValue,
  })
}

async function writeExpoSession(
  homeDirectory: string,
  session: { sessionSecret: string; id: string; username: string }
): Promise<void> {
  const statePath = path.join(homeDirectory, ".expo", "state.json")

  await mkdir(path.dirname(statePath), { recursive: true })

  const state = {
    auth: {
      sessionSecret: session.sessionSecret,
      userId: session.id,
      username: session.username,
      currentConnection: "Username-Password-Authentication",
    },
  }

  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, {
    mode: 0o600,
  })
}

async function resolveEasCliRoot(): Promise<string> {
  const easBinary = Bun.which("eas")

  if (!easBinary) {
    throw new Error("The `eas` command was not found in PATH.")
  }

  const basedir = path.dirname(easBinary)
  const resolvedBinary = await resolveRealpathSafe(easBinary)
  const resolvedBasedir = path.dirname(resolvedBinary)
  const wrapperCandidates = [
    ...(await collectWrapperCandidates(easBinary, basedir)),
    ...(await collectWrapperCandidates(resolvedBinary, resolvedBasedir)),
  ]
  const candidates = [
    ...collectAncestorCandidates(easBinary),
    ...collectAncestorCandidates(resolvedBinary),
    ...wrapperCandidates,
  ].filter((candidate, index, all) => all.indexOf(candidate) === index)

  for (const candidate of candidates) {
    try {
      if (await isEasCliRoot(candidate)) {
        return candidate
      }
    } catch {
      // Keep trying the next detected wrapper path.
    }
  }

  throw new Error(
    `Unable to resolve the installed eas-cli package path from ${easBinary}.`
  )
}

function normalizeWrapperPath(candidate: string, basedir: string): string {
  const resolved = candidate.replaceAll("$basedir", basedir)
  return path.isAbsolute(resolved) ? resolved : path.resolve(basedir, resolved)
}

function collectAncestorCandidates(binaryPath: string): string[] {
  const candidates: string[] = []
  let currentDir = path.dirname(binaryPath)

  while (true) {
    candidates.push(currentDir)

    const parentDir = path.dirname(currentDir)
    if (parentDir === currentDir) {
      break
    }

    currentDir = parentDir
  }

  return candidates
}

async function collectWrapperCandidates(
  binaryPath: string,
  basedir: string
): Promise<string[]> {
  try {
    const wrapper = await readFile(binaryPath, "utf8")
    return [
      ...wrapper.matchAll(/["']([^"']*node_modules\/eas-cli)\/bin\/run["']/g),
      ...wrapper.matchAll(
        /["']([^"']*node_modules\/eas-cli)\/bin\/node_modules/g
      ),
      ...wrapper.matchAll(/["']([^"']*node_modules\/eas-cli)\/node_modules/g),
    ].map((match) => normalizeWrapperPath(match[1], basedir))
  } catch {
    return []
  }
}

async function isEasCliRoot(candidate: string): Promise<boolean> {
  const packageJsonPath = path.join(candidate, "package.json")
  const runPath = path.join(candidate, "bin", "run")
  const buildPath = path.join(candidate, "build")

  try {
    await access(runPath)
    await access(buildPath)
  } catch {
    return false
  }

  try {
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
      name?: string
    }

    return packageJson.name === "eas-cli"
  } catch {
    return false
  }
}

async function resolveRealpathSafe(filePath: string): Promise<string> {
  try {
    return await realpath(filePath)
  } catch {
    return filePath
  }
}

async function runCommand(
  cmd: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv; stdio: "inherit" | "pipe" }
): Promise<number> {
  const proc = Bun.spawn({
    cmd,
    cwd: options.cwd,
    env: options.env,
    stdin: "inherit",
    stdout: options.stdio,
    stderr: options.stdio,
  })

  return await proc.exited
}
