import { normalizeCooperativeCodePrefix } from "@halaalvest/utils"
import { normalizeWorkspaceSlug } from "./signup-flow"

/**
 * Marketing "Sign in" resolves what a returning admin or member remembers
 * (their workspace address or their member code) to their cooperative's own
 * sign-in page. It only ever reveals what the public sign-up availability check
 * already does: whether a workspace address or code prefix is taken. Member
 * numbers are never looked up, so a code only identifies its cooperative.
 */

export type WorkspaceSignInCandidate =
  | { kind: "slug"; value: string }
  | { kind: "prefix"; value: string }

export type WorkspaceSignInLookups = {
  findByPrefix: (prefix: string) => Promise<{ slug: string } | null>
  findBySlug: (slug: string) => Promise<{ slug: string } | null>
}

export const WORKSPACE_NOT_FOUND_MESSAGE =
  "We couldn't find a cooperative with that address or code. Check the link in your welcome email, or ask your cooperative's admin."

const MAX_INPUT_LENGTH = 253
const PREFIX_PATTERN = /^[A-Za-z]{3,5}$/
// A member code: 3–5 prefix letters, a separator, then a member number with at
// least one digit (AMS-0001, ams 12, AMS-A12).
const ACCESS_CODE_PATTERN =
  /^([A-Za-z]{3,5})[\s\-_]+([A-Za-z0-9]*\d[A-Za-z0-9]*)$/

function hostnameFromInput(value: string) {
  try {
    return new URL(value.includes("://") ? value : `https://${value}`).hostname
  } catch {
    return null
  }
}

export function getWorkspaceSignInCandidates(
  input: string | null | undefined
): WorkspaceSignInCandidate[] {
  const raw = (input ?? "").trim()

  if (!raw || raw.length > MAX_INPUT_LENGTH) return []

  // A pasted address: amana-savings.halaalvest.com, https://…/login.
  if (raw.includes(".") || raw.includes("/")) {
    const hostname = hostnameFromInput(raw)
    const labels = hostname?.split(".").filter(Boolean) ?? []
    const slug =
      labels.length > 1 ? normalizeWorkspaceSlug(labels[0] ?? "") : ""

    return slug ? [{ kind: "slug", value: slug }] : []
  }

  const candidates: WorkspaceSignInCandidate[] = []
  const accessCode = ACCESS_CODE_PATTERN.exec(raw)

  if (accessCode?.[1]) {
    candidates.push({
      kind: "prefix",
      value: normalizeCooperativeCodePrefix(accessCode[1]),
    })
  }

  const slug = normalizeWorkspaceSlug(raw)
  if (slug) candidates.push({ kind: "slug", value: slug })

  if (PREFIX_PATTERN.test(raw)) {
    candidates.push({
      kind: "prefix",
      value: normalizeCooperativeCodePrefix(raw),
    })
  }

  return candidates.filter(
    (candidate, index) =>
      candidates.findIndex(
        (other) =>
          other.kind === candidate.kind && other.value === candidate.value
      ) === index
  )
}

export async function resolveWorkspaceSignInSlug(
  input: string | null | undefined,
  lookups: WorkspaceSignInLookups
) {
  for (const candidate of getWorkspaceSignInCandidates(input)) {
    const tenant =
      candidate.kind === "slug"
        ? await lookups.findBySlug(candidate.value)
        : await lookups.findByPrefix(candidate.value)

    if (tenant?.slug) return tenant.slug
  }

  return null
}

export function buildWorkspaceLoginUrl(dashboardUrl: string) {
  return new URL("/login", dashboardUrl).toString()
}

/** The normalized member code (ABC-0001) when the input is one, else null. */
export function getMemberCodeFromSignInInput(input: string | null | undefined) {
  const match = ACCESS_CODE_PATTERN.exec((input ?? "").trim())

  return match?.[1] && match[2]
    ? `${match[1].toUpperCase()}-${match[2].toUpperCase()}`
    : null
}

/**
 * The tenant host's prefill endpoint. Marketing top-level POSTs the member
 * code there (never in a URL); it redirects to /login with the code filled in.
 */
export function buildLoginPrefillAction(loginUrl: string) {
  return new URL("/auth/login-prefill", loginUrl).toString()
}
