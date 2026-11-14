import type { TenantDomainRecord } from "@halaalvest/db"

/** Addresses Halaalvest runs itself are always working. */
export function isPlatformDomain(domain: Pick<TenantDomainRecord, "kind">) {
  return domain.kind === "site" || domain.kind === "dashboard"
}

/** A plain status word and one line of what to do next. */
export function getDomainStatus(
  domain: Pick<
    TenantDomainRecord,
    "kind" | "verificationStatus" | "verificationTarget"
  >
): { detail: string; ready: boolean; word: string } {
  if (isPlatformDomain(domain)) {
    return { detail: "Run by Halaalvest.", ready: true, word: "Working" }
  }

  const pointTo = domain.verificationTarget
    ? `At your domain provider, add a CNAME record that points to ${domain.verificationTarget}. Then press Check now.`
    : "Point it to Halaalvest at your domain provider. Then press Check now."

  if (domain.verificationStatus === "verified") {
    return {
      detail: "It points to Halaalvest.",
      ready: true,
      word: "Ready",
    }
  }

  if (domain.verificationStatus === "failed") {
    return { detail: pointTo, ready: false, word: "Not pointing to us yet" }
  }

  return { detail: pointTo, ready: false, word: "Waiting for your settings" }
}
