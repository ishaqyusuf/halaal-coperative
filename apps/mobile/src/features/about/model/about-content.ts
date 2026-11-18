/**
 * About HalaalVest (T28, owner pick 01 Grouped settings, 18 Nov 2026).
 * Static app content only: no API reads. Platform documents live on the
 * marketing site; this screen is the one in-app path to them.
 */
export const aboutCopy = {
  name: "HalaalVest",
  tagline: "Interest-free cooperative finance",
  body: "HalaalVest is the app your cooperative uses to keep member records, contributions, shares and financing. Your cooperative decides who can join and approves money movements.",
} as const

export const SUPPORT_EMAIL = "hello@halaalvest.com"

export type SocialAccount = {
  key: string
  label: string
  handle: string
  url: string
  icon: string
}

/**
 * The platform's social accounts. Empty until the owner confirms the real
 * handles; "Follow us" is hidden while nothing is listed.
 */
export const socialAccounts: readonly SocialAccount[] = []

export const aboutLegalLinks = [
  { path: "/terms", label: "Terms of use" },
  { path: "/privacy", label: "Privacy policy" },
  { path: "/cooperative-disclosures", label: "Cooperative disclosures" },
] as const

/** Only accounts with a handle and an https link are shown. */
export function visibleSocialAccounts(accounts: readonly SocialAccount[]) {
  return accounts.filter(
    (account) =>
      account.handle.trim().length > 0 && account.url.startsWith("https://")
  )
}

/** "1.4.0 (112)", or just the version when the build number is unknown. */
export function formatAppVersion(
  version: string | null | undefined,
  build: string | null | undefined
) {
  const v = version?.trim() || "Unknown"
  const b = build?.trim()
  return b ? `${v} (${b})` : v
}

/** "halaalvest.com" from "https://halaalvest.com". */
export function siteLabel(origin: string) {
  return new URL(origin).hostname.replace(/^www\./, "")
}
