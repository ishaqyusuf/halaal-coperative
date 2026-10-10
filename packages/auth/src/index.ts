import type { MembershipRecord, UserRecord } from "@halaalvest/db"
import { resolveDashboardSessionScope } from "@halaalvest/utils"
import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto"
export * from "./roles"

export type SessionScope = typeof platformSessionScope | string

export type AuthSession = {
  mobileDeviceSessionId?: string
  qaAuthorizationId?: string
  scope: SessionScope
  sessionExpiresAt?: number
  token: string
  user: UserRecord
}

export type SignedSessionPayload = {
  expiresAt: number
  membershipId?: string
  nonce: string
  qaAuthorizationId?: string
  sessionKind?: "mobile"
  scope: SessionScope
  tenantId?: string
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
const passwordKeyLength = 64

function getAuthEvidenceSecret() {
  const secret =
    process.env.AUTH_EVIDENCE_SECRET?.trim() ??
    process.env.SIGNUP_TOKEN_SECRET?.trim() ??
    process.env.AUTH_SECRET?.trim()

  if (secret) return secret
  if (process.env.NODE_ENV !== "production") {
    return "halaalvest-dev-auth-evidence-secret"
  }

  throw new Error("AUTH_EVIDENCE_SECRET is required in production.")
}

function getSignupTokenSecret() {
  const secret = process.env.SIGNUP_TOKEN_SECRET?.trim()
  if (secret) return secret
  if (process.env.NODE_ENV !== "production") {
    return "halaalvest-dev-signup-secret"
  }
  throw new Error("SIGNUP_TOKEN_SECRET is required in production.")
}

export type MemberSignupLinkTokenPayload = {
  linkId: string
  tenantId: string
  tokenVersion: number
}

export function createMemberSignupLinkToken(
  payload: MemberSignupLinkTokenPayload
) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const signature = createHmac("sha256", getSignupTokenSecret())
    .update(body)
    .digest("base64url")
  return `${body}.${signature}`
}

export function verifyMemberSignupLinkToken(token: string) {
  const [body, signature] = token.trim().split(".")
  if (!body || !signature) throw new Error("The signup link is invalid.")

  const expected = Buffer.from(
    createHmac("sha256", getSignupTokenSecret())
      .update(body)
      .digest("base64url")
  )
  const received = Buffer.from(signature)
  if (
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  ) {
    throw new Error("The signup link is invalid.")
  }

  let payload: unknown
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"))
  } catch {
    throw new Error("The signup link is invalid.")
  }
  if (
    !payload ||
    typeof payload !== "object" ||
    !("linkId" in payload) ||
    typeof payload.linkId !== "string" ||
    !("tenantId" in payload) ||
    typeof payload.tenantId !== "string" ||
    !("tokenVersion" in payload) ||
    typeof payload.tokenVersion !== "number" ||
    !Number.isInteger(payload.tokenVersion) ||
    payload.tokenVersion < 1
  ) {
    throw new Error("The signup link is invalid.")
  }
  return payload as MemberSignupLinkTokenPayload
}

export function hashPassword(password: string) {
  const normalized = password.trim()

  if (!normalized) throw new Error("Password is required.")

  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(normalized, salt, passwordKeyLength).toString("hex")

  return `${salt}:${hash}`
}

export function createAuthEvidenceCode() {
  const value = randomBytes(4).readUInt32BE(0) % 1_000_000
  return value.toString().padStart(6, "0")
}

export function createAuthEvidenceToken() {
  return randomBytes(32).toString("base64url")
}

export function hashAuthEvidence(value: string) {
  return createHmac("sha256", getAuthEvidenceSecret())
    .update(value.trim())
    .digest("hex")
}

export function hashAuthRateLimitSignal(value: string) {
  return createHmac("sha256", getAuthEvidenceSecret())
    .update(`rate-limit:${value.trim().toLowerCase()}`)
    .digest("hex")
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
  const secret = process.env.AUTH_SECRET

  if (secret?.trim()) {
    return secret.trim()
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is required in production.")
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

type CreateSignedSessionInput = {
  expiresAt?: number
  membershipId?: string | null
  nonce?: string
  qaAuthorizationId?: string | null
  scope: SessionScope
  sessionKind?: "mobile"
  tenantId?: string | null
  userId: string
}

export async function createSignedSessionTokenBundle(
  input: CreateSignedSessionInput
) {
  const payload = {
    expiresAt: input.expiresAt ?? Date.now() + sessionTtlMs,
    ...(input.membershipId ? { membershipId: input.membershipId } : {}),
    nonce: input.nonce ?? crypto.randomUUID(),
    ...(input.qaAuthorizationId
      ? { qaAuthorizationId: input.qaAuthorizationId }
      : {}),
    ...(input.sessionKind ? { sessionKind: input.sessionKind } : {}),
    scope: input.scope,
    ...(input.tenantId ? { tenantId: input.tenantId } : {}),
    userId: input.userId,
  } satisfies SignedSessionPayload
  const encodedPayload = encodeBase64Url(JSON.stringify(payload))
  const { signature } = await signValue(encodedPayload)

  return { payload, token: `${encodedPayload}.${signature}` }
}

function getQaAcceleratorSecret() {
  const secret = process.env.QA_ACCELERATOR_SECRET?.trim()
  if (!secret) {
    throw new Error(
      "QA_ACCELERATOR_SECRET is required for QA accelerator access."
    )
  }
  return secret
}

export function hashQaAcceleratorEvidence(value: string) {
  return createHmac("sha256", getQaAcceleratorSecret())
    .update(value.trim())
    .digest("hex")
}

export async function createSignedSessionToken(
  input: CreateSignedSessionInput
) {
  return (await createSignedSessionTokenBundle(input)).token
}

export function verifyPassword(
  password: string,
  storedHash: string | null | undefined
) {
  if (!storedHash) {
    return false
  }

  const [salt, hash] = storedHash.split(":")

  if (!salt || !hash) {
    return false
  }

  const derived = scryptSync(password.trim(), salt, passwordKeyLength)
  const expected = Buffer.from(hash, "hex")

  return (
    derived.length === expected.length && timingSafeEqual(derived, expected)
  )
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
