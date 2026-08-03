export type DbRuntimeStatus = "seed-only" | "database-configured"

export function getDbRuntimeStatus(): DbRuntimeStatus {
  return process.env.HALAALVEST_DATABASE_URL
    ? "database-configured"
    : "seed-only"
}

export function createDbRuntime() {
  return {
    status: getDbRuntimeStatus(),
  }
}
