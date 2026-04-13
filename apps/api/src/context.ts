import { cooperativeRoles } from "@amanah/auth"
import { listSeedTenants } from "@amanah/db"

export async function buildRequestContext(headers: Headers) {
  const tenantId = headers.get("x-tenant-id") ?? listSeedTenants()[0]?.id ?? null
  const userRole = headers.get("x-user-role") ?? "tenant-admin"

  return {
    auth: {
      session: {
        userId: "demo-user",
      },
      activeTenantId: tenantId,
      role: cooperativeRoles.includes(userRole as (typeof cooperativeRoles)[number])
        ? (userRole as (typeof cooperativeRoles)[number])
        : "member",
    },
    request: {
      receivedAt: new Date().toISOString(),
    },
  }
}

export async function createTRPCContext(opts: { req: Request }) {
  return buildRequestContext(opts.req.headers)
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>
