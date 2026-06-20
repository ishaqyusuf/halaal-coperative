import type {
  MembershipRecord,
  MembershipRole,
  UserRecord,
} from "@halaalvest/db"
import { resolveDashboardSessionScope } from "@halaalvest/utils"

export const cooperativeRoles = [
  "super_admin",
  "tenant_admin",
  "finance_officer",
  "operations_officer",
  "member",
] as const

export type CooperativeRole = (typeof cooperativeRoles)[number]
export type SessionScope = typeof platformSessionScope | string

export type AuthSession = {
  scope: SessionScope
  token: string
  user: UserRecord
}

export type SignedSessionPayload = {
  expiresAt: number
  nonce: string
  scope: SessionScope
  userId: string
}

export type AuthContext = {
  activeMembership: MembershipRecord | null
  session: AuthSession | null
}

export const authSessionCookieName = "halaalvest_session"
export const authUserCookieName = "halaalvest_user"
export const platformSessionScope = "platform"
const sessionTtlMs = 1000 * 60 * 60 * 24 * 7

const roleRank: Record<CooperativeRole, number> = {
  super_admin: 99,
  tenant_admin: 4,
  finance_officer: 3,
  operations_officer: 2,
  member: 1,
}

export function normalizeRole(
  input: string | null | undefined
): CooperativeRole | null {
  if (!input) {
    return null
  }

  const normalized = input.trim().toLowerCase().replace(/-/g, "_")

  return cooperativeRoles.includes(normalized as CooperativeRole)
    ? (normalized as CooperativeRole)
    : null
}

export function getScopedAuthSessionCookieName(scope: SessionScope) {
  return scope === platformSessionScope
    ? authSessionCookieName
    : `${authSessionCookieName}_${scope}`
}

export function getScopedAuthUserCookieName(scope: SessionScope) {
  return scope === platformSessionScope
    ? authUserCookieName
    : `${authUserCookieName}_${scope}`
}

export function parseCookieHeader(cookieHeader: string | null | undefined) {
  if (!cookieHeader) {
    return new Map<string, string>()
  }

  return new Map(
    cookieHeader
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separatorIndex = part.indexOf("=")
        return [part.slice(0, separatorIndex), part.slice(separatorIndex + 1)]
      })
  )
}

function getSessionSecret() {
  const secret =
    process.env.HALAAL_VEST_AUTH_SECRET ??
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET

  if (secret?.trim()) {
    return secret.trim()
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("HALAAL_VEST_AUTH_SECRET is required in production.")
  }

  return "halaalvest-dev-session-secret"
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url")
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8")
}

async function signValue(value: string) {
  const { createHmac, timingSafeEqual } = await import("node:crypto")
  const signature = createHmac("sha256", getSessionSecret())
    .update(value)
    .digest("base64url")

  return {
    signature,
    verify(candidate: string) {
      const expected = Buffer.from(signature)
      const actual = Buffer.from(candidate)

      return (
        actual.length === expected.length && timingSafeEqual(actual, expected)
      )
    },
  }
}

export async function createSignedSessionToken(input: {
  scope: SessionScope
  userId: string
}) {
  const payload = {
    expiresAt: Date.now() + sessionTtlMs,
    nonce: crypto.randomUUID(),
    scope: input.scope,
    userId: input.userId,
  } satisfies SignedSessionPayload
  const encodedPayload = encodeBase64Url(JSON.stringify(payload))
  const { signature } = await signValue(encodedPayload)

  return `${encodedPayload}.${signature}`
}

export async function verifySignedSessionToken(input: {
  expectedScope?: SessionScope | null
  token: string | null | undefined
}) {
  if (!input.token) {
    return null
  }

  const [encodedPayload, signature] = input.token.split(".")

  if (!encodedPayload || !signature) {
    return null
  }

  const verifier = await signValue(encodedPayload)

  if (!verifier.verify(signature)) {
    return null
  }

  try {
    const payload = JSON.parse(
      decodeBase64Url(encodedPayload)
    ) as Partial<SignedSessionPayload>

    if (
      !payload.userId ||
      !payload.scope ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= Date.now()
    ) {
      return null
    }

    if (input.expectedScope && payload.scope !== input.expectedScope) {
      return null
    }

    return payload as SignedSessionPayload
  } catch {
    return null
  }
}

export function resolveRequestSessionScope(host: string | null | undefined) {
  return resolveDashboardSessionScope(host) ?? platformSessionScope
}

export function getSessionTokenFromCookieHeader(input: {
  cookieHeader?: string | null
  host?: string | null
  explicitScope?: SessionScope | null
}) {
  const cookies = parseCookieHeader(input.cookieHeader)
  const scope = input.explicitScope ?? resolveRequestSessionScope(input.host)
  const scopedCookieName = getScopedAuthSessionCookieName(scope)

  return (
    cookies.get(scopedCookieName) ?? cookies.get(authSessionCookieName) ?? null
  )
}

export function getUserIdFromCookieHeader(input: {
  cookieHeader?: string | null
  host?: string | null
  explicitScope?: SessionScope | null
}) {
  const cookies = parseCookieHeader(input.cookieHeader)
  const scope = input.explicitScope ?? resolveRequestSessionScope(input.host)
  const scopedCookieName = getScopedAuthUserCookieName(scope)

  return (
    cookies.get(scopedCookieName) ?? cookies.get(authUserCookieName) ?? null
  )
}

export function hasActiveMembership(auth: AuthContext): auth is AuthContext & {
  activeMembership: MembershipRecord
  session: AuthSession
} {
  return Boolean(auth.session && auth.activeMembership)
}

export function isRoleAtLeast(
  actual: MembershipRole,
  required: MembershipRole
): boolean {
  return roleRank[actual] >= roleRank[required]
}

export function canApproveLoan(role: CooperativeRole) {
  return (
    role === "super_admin" ||
    role === "tenant_admin" ||
    role === "finance_officer"
  )
}

export function getRoleDisplayName(
  role: CooperativeRole | MembershipRole | null | undefined
) {
  switch (role) {
    case "super_admin":
      return "Super Admin"
    case "tenant_admin":
      return "Tenant Admin"
    case "finance_officer":
      return "Finance Officer"
    case "operations_officer":
      return "Operations Officer"
    case "member":
      return "Member"
    default:
      return "Guest"
  }
}

export function getRoleScopeSummary(
  role: CooperativeRole | MembershipRole | null | undefined
) {
  switch (role) {
    case "super_admin":
      return "Platform-level oversight across cooperative workspaces."
    case "tenant_admin":
      return "Administrative control over cooperative setup and operations."
    case "finance_officer":
      return "Financial operations across collections, charges, and repayments."
    case "operations_officer":
      return "Member operations, public site updates, and day-to-day coordination."
    case "member":
      return "Member-facing visibility into notifications and cooperative activity."
    default:
      return "No active cooperative role."
  }
}
