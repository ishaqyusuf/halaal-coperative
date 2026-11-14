import type { TrustReadinessItem } from "./load-trust-readiness-page"

/** Only a working https link counts; a saved link is not legal approval. */
export function isSecureLink(url: string | null | undefined) {
  if (!url) return false

  try {
    return new URL(url).protocol === "https:"
  } catch {
    return false
  }
}

function linkHost(url: string) {
  return new URL(url).host
}

/** One checklist row per legal document link. */
export function buildLegalReadinessItems(profile: {
  legalTermsUrl: string | null
  privacyPolicyUrl: string | null
  dataProcessingUrl: string | null
}): TrustReadinessItem[] {
  return [
    { key: "terms", label: "Terms for members", url: profile.legalTermsUrl },
    { key: "privacy", label: "Privacy notice", url: profile.privacyPolicyUrl },
    {
      key: "data",
      label: "Data agreement",
      url: profile.dataProcessingUrl,
    },
  ].map(({ key, label, url }) => {
    const done = isSecureLink(url)

    return {
      detail: done
        ? `Link on ${linkHost(url!)}`
        : url
          ? "The saved link doesn't start with https://"
          : "Add a link to it.",
      done,
      key,
      label,
    }
  })
}
