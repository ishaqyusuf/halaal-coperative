export const mobileLegalLinks = [
  ["terms", "Platform terms"],
  ["privacy", "Privacy notice"],
  ["billing-policy", "Billing policy"],
  ["delete-account", "Delete account"],
  ["legal-agreements", "Platform document acknowledgements"],
  ["support", "Platform support"],
  ["cooperative-disclosures", "Cooperative disclosures"],
] as const

export type MobileLegalLinkSlug = (typeof mobileLegalLinks)[number][0]

export function publicLegalLinkPath(slug: MobileLegalLinkSlug) {
  return `/${slug === "legal-agreements" ? "terms" : slug}`
}
