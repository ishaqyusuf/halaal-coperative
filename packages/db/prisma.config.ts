import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { parseEnv } from "node:util"
import { fileURLToPath } from "node:url"
import { defineConfig, env } from "prisma/config"

const __filename = fileURLToPath(import.meta.url)
const workspaceDir = path.dirname(__filename)
const repoRoot = path.resolve(workspaceDir, "../..")

function mergeEnvFile(filePath: string, targetEnv: NodeJS.ProcessEnv) {
  if (!existsSync(filePath)) {
    return
  }

  const parsed = parseEnv(readFileSync(filePath, "utf8"))

  for (const [key, value] of Object.entries(parsed)) {
    if (value !== undefined) {
      targetEnv[key] = value
    }
  }
}

function loadEnv() {
  const loadedEnv: Record<string, string | undefined> = {}
  const envFiles = envFilesForMode(normalizeMode())

  for (const filePath of envFiles) {
    mergeEnvFile(filePath, loadedEnv)
  }

  for (const [key, value] of Object.entries({
    ...loadedEnv,
    ...process.env,
  })) {
    if (value !== undefined) {
      process.env[key] = value
    }
  }
}

function normalizeMode() {
  if (
    process.env.HALAALVEST_DB_MODE === "prod" ||
    process.env.HALAALVEST_DB_MODE === "production" ||
    process.env.HALAALVEST_ENV_MODE === "prod" ||
    process.env.APP_ENV === "production" ||
    process.env.NODE_ENV === "production"
  ) {
    return "prod"
  }

  if (
    process.env.HALAALVEST_DB_MODE === "remote" ||
    process.env.HALAALVEST_DB_MODE === "remote-dev" ||
    process.env.HALAALVEST_ENV_MODE === "remote"
  ) {
    return "remote"
  }

  return "local"
}

function envFilesForMode(mode: string) {
  if (mode === "prod") {
    return [path.join(repoRoot, ".env.prod")]
  }

  if (mode === "remote") {
    return [
      path.join(repoRoot, ".env.local"),
      path.join(repoRoot, ".env.remote.local"),
    ]
  }

  return [path.join(repoRoot, ".env.local")]
}

loadEnv()

export default defineConfig({
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    path: "prisma/migrations",
  },
  schema: "prisma",
})
