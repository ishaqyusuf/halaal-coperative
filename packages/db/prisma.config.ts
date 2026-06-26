import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { parseEnv } from "node:util"
import { fileURLToPath } from "node:url"
import { defineConfig, env } from "prisma/config"

const __filename = fileURLToPath(import.meta.url)
const workspaceDir = path.dirname(__filename)
const repoRoot = path.resolve(workspaceDir, "../..")

function mergeEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return
  }

  const parsed = parseEnv(readFileSync(filePath, "utf8"))

  for (const [key, value] of Object.entries(parsed)) {
    if (value !== undefined && !process.env[key]) {
      process.env[key] = value
    }
  }
}

function loadEnv() {
  const isProduction =
    process.env.NODE_ENV === "production" ||
    process.env.HALAALVEST_ENV === "production"
  const envFiles = [
    path.join(repoRoot, ".env"),
    path.join(repoRoot, ".env.development"),
    ...(isProduction
      ? [
          path.join(repoRoot, ".env.production"),
          path.join(repoRoot, ".env.production.local"),
        ]
      : []),
    path.join(workspaceDir, ".env"),
    path.join(workspaceDir, ".env.development"),
    ...(isProduction
      ? [
          path.join(workspaceDir, ".env.production"),
          path.join(workspaceDir, ".env.production.local"),
        ]
      : []),
  ]

  for (const filePath of envFiles) {
    mergeEnvFile(filePath)
  }
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
