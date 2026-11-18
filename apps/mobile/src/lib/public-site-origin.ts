/**
 * The public marketing site this build may open (terms, privacy, disclosures,
 * the website itself). Store and Preview builds set `EXPO_PUBLIC_LEGAL_ORIGIN`
 * (ADR-20260925-configure-mobile-public-legal-origin); a missing or unsafe
 * value means "no public site", and callers hide those links.
 */
export function resolvePublicSiteOrigin(value: string | undefined) {
  const configured = value?.trim()
  if (!configured) return null
  try {
    const url = new URL(configured)
    const hostname = url.hostname.toLowerCase().replace(/\.$/, "")
    return url.protocol === "https:" &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password &&
      hostname !== "localhost" &&
      !/(?:^|\.)(?:localhost|local|internal|invalid|test|example)$/.test(
        hostname
      ) &&
      !/(?:^|\.)example\.(?:com|net|org)$/.test(hostname) &&
      !/^\d+\.\d+\.\d+\.\d+$/.test(hostname) &&
      !hostname.startsWith("[")
      ? url.origin
      : null
  } catch {
    return null
  }
}

export const publicSiteOrigin = resolvePublicSiteOrigin(
  process.env.EXPO_PUBLIC_LEGAL_ORIGIN
)
