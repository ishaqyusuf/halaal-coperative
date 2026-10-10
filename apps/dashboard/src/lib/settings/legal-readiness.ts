import type { TrustReadinessItem } from "./load-trust-readiness-page"

/** References are evidence of configuration, never approval or publication. */
export function buildLegalReadinessItems(profile: {
  legalTermsUrl: string | null
  privacyPolicyUrl: string | null
  dataProcessingUrl: string | null
}): TrustReadinessItem[] {
  return [
    { label: "Cooperative terms", url: profile.legalTermsUrl },
    { label: "Cooperative privacy notice", url: profile.privacyPolicyUrl },
    { label: "Data-processing agreement", url: profile.dataProcessingUrl },
  ].map(({ label, url }) => {
    let validReference = false
    try {
      validReference = Boolean(url && new URL(url).protocol === "https:")
    } catch {
      // Invalid saved references remain visible as incomplete evidence.
    }
    return {
      label,
      owner: "Legal and cooperative administrator",
      status: validReference ? "Reference saved; review required" : "Document required",
      evidence: validReference ? "HTTPS reference saved" : "Missing or invalid HTTPS reference",
      detail: "Confirm the accessible document, exact version, effective date, scope, and legal approval. Saving a link or reviewing this checklist does not approve a legal document.",
      tone: "warning",
    }
  })
}
