import { createHmac, timingSafeEqual } from "node:crypto"
import { z } from "zod"
import type { AnalyticsContext, Attribution } from "./attribution"

const claimsSchema = z.object({
  version: z.literal(1),
  project: z.string(),
  issuedAt: z.number(),
  expiresAt: z.number(),
  actorId: z.string().max(128).optional(),
  groups: z
    .record(
      z.string(),
      z.object({
        key: z.string().max(128),
        properties: z
          .record(
            z.string(),
            z.union([z.string().max(256), z.number(), z.boolean(), z.null()])
          )
          .optional(),
      })
    )
    .optional(),
  properties: z.record(
    z.string(),
    z.union([z.string().max(256), z.number(), z.boolean(), z.null()])
  ),
})
function secret() {
  const value = process.env.LOGLY_ATTRIBUTION_SECRET
  return value && value.length >= 32 ? value : null
}
function digest(value: string, key: string) {
  return createHmac("sha256", key).update(value).digest("base64url")
}
export function issueAnalyticsContext(input: {
  project: "halaalvest-dashboard" | "halaalvest-mobile"
  user?: { id: string; isPlatformOwner?: boolean } | null
  tenant?: { id: string; name: string } | null
  role?: string | null
  now?: number
}): AnalyticsContext | null {
  const key = secret()
  if (!key) return null
  const now = input.now ?? Date.now()
  const ref = (kind: string, id: string) =>
    digest(JSON.stringify([input.project, kind, id]), key)
  const attribution: Attribution = {
    ...(input.user ? { actorId: ref("user", input.user.id) } : {}),
    ...(input.tenant
      ? {
          groups: {
            business: {
              key: ref("business", input.tenant.id),
              properties: {
                name: input.tenant.name.slice(0, 256),
                kind: "cooperative",
              },
            },
          },
        }
      : {}),
    properties: {
      surface:
        input.project === "halaalvest-mobile"
          ? "mobile"
          : input.user
            ? "dashboard"
            : "tenant_site",
      audience: input.user?.isPlatformOwner
        ? "internal"
        : input.user
          ? "business"
          : "anonymous",
      workspace_role: input.role ?? null,
    },
  }
  const expiresAt = now + 60 * 60 * 1000
  const payload = Buffer.from(
    JSON.stringify({
      version: 1,
      project: input.project,
      issuedAt: now,
      expiresAt,
      ...attribution,
    })
  ).toString("base64url")
  return {
    token: `${payload}.${digest(payload, key)}`,
    expiresAt,
    scope: ref(
      "scope",
      JSON.stringify([
        input.user?.id ?? null,
        input.tenant?.id ?? null,
        input.role ?? null,
      ])
    ),
  }
}

// Signature binds identity at capture time. A later login never retags queued events.
export function verifyAnalyticsContext(
  token: string | undefined,
  project: string,
  occurredAt: string,
  now = Date.now()
): Attribution | null {
  const key = secret()
  if (!key || !token || token.length > 4096) return null
  try {
    const [payload, signature, extra] = token.split(".")
    if (!payload || !signature || extra) return null
    const expected = Buffer.from(digest(payload, key))
    const actual = Buffer.from(signature)
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
      return null
    const claims = claimsSchema.parse(
      JSON.parse(Buffer.from(payload, "base64url").toString())
    )
    const captured = Date.parse(occurredAt)
    if (
      claims.project !== project ||
      !Number.isFinite(captured) ||
      captured < claims.issuedAt - 60_000 ||
      captured > claims.expiresAt ||
      captured > now + 60_000 ||
      now - captured > 86_400_000
    )
      return null
    return {
      actorId: claims.actorId,
      groups: claims.groups,
      properties: claims.properties,
    }
  } catch {
    return null
  }
}
