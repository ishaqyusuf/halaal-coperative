import { createPrismaClient } from "@halaalvest/db"

// Liveness never touches the database: Neon bills active compute time and
// suspends after five idle minutes, so a DB-backed uptime probe keeps the
// endpoint awake all day. Database readiness is a separate, explicit check
// for rollout and diagnosis only.
export function buildLivenessPayload(now: Date = new Date()) {
  return {
    api: "ok" as const,
    check: "liveness" as const,
    timestamp: now.toISOString(),
  }
}

type ReadinessProbe = (() => Promise<unknown>) | null

function defaultReadinessProbe(): ReadinessProbe {
  const prisma = createPrismaClient()
  return prisma ? () => prisma.$queryRaw`SELECT 1` : null
}

export async function checkDatabaseReadiness(
  probe: ReadinessProbe = defaultReadinessProbe(),
  clock: () => number = () => performance.now()
) {
  const timestamp = new Date().toISOString()
  if (!probe) {
    return {
      body: {
        api: "ok" as const,
        check: "readiness" as const,
        database: "not-configured" as const,
        timestamp,
      },
      status: 503 as const,
    }
  }

  const startedAt = clock()
  try {
    await probe()
    return {
      body: {
        api: "ok" as const,
        check: "readiness" as const,
        database: "ready" as const,
        latencyMs: Math.round(clock() - startedAt),
        timestamp,
      },
      status: 200 as const,
    }
  } catch {
    return {
      body: {
        api: "ok" as const,
        check: "readiness" as const,
        database: "unavailable" as const,
        latencyMs: Math.round(clock() - startedAt),
        timestamp,
      },
      status: 503 as const,
    }
  }
}
