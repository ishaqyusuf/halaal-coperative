export type QaQuickFillContext = {
  emailDomain: string
  enabled: boolean
  qaDomains: string[]
}

function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/^@/, "").replace(/\.$/, "")
}

export function getEmailDomain(value: string | null | undefined) {
  const email = value?.trim().toLowerCase() ?? ""
  const separatorIndex = email.lastIndexOf("@")

  return separatorIndex > 0 ? normalizeDomain(email.slice(separatorIndex + 1)) : ""
}

export function resolveQaQuickFillContext(input: {
  authenticatedEmail: string | null | undefined
  configuredDomains: readonly string[]
  isDevelopment: boolean
}): QaQuickFillContext {
  const qaDomains = Array.from(
    new Set(
      input.configuredDomains
        .map(normalizeDomain)
        .filter(Boolean),
    ),
  )
  const authenticatedDomain = getEmailDomain(input.authenticatedEmail)
  const authenticatedQaDomain = qaDomains.find(
    (domain) => domain === authenticatedDomain,
  )
  const enabled = input.isDevelopment || Boolean(authenticatedQaDomain)
  const emailDomain =
    authenticatedQaDomain ?? qaDomains[0] ?? (input.isDevelopment ? "example.test" : "")

  return {
    emailDomain,
    enabled,
    qaDomains: qaDomains.length > 0 ? qaDomains : input.isDevelopment ? ["example.test"] : [],
  }
}

export function normalizeCooperativeQaSlug(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63)
    .replace(/-+$/g, "")

  return normalized || "cooperative"
}

export function buildQaEmail(localPart: string, domain: string) {
  const normalizedLocalPart = normalizeCooperativeQaSlug(localPart)
  const normalizedDomain = normalizeDomain(domain)

  return `${normalizedLocalPart}@${normalizedDomain || "example.test"}`
}

export function isEmailAtQaDomain(
  email: string | null | undefined,
  qaDomains: readonly string[],
) {
  const domain = getEmailDomain(email)

  return qaDomains.some((candidate) => normalizeDomain(candidate) === domain)
}
