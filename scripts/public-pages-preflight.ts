import { trustedExternalDeletionOrigin } from "../apps/marketing/src/lib/external-deletion-link"
import { isApprovedPublicPolicy } from "../packages/db/src/legal-publication"
import {
  policyPublications,
  publicDeletionFlowCopy,
  publicPolicies,
  type PolicyPublication,
} from "../packages/domain/src/modules/public-policies"

export const requiredPublicPages = [
  "terms",
  "privacy",
  "support",
  "delete-account",
  "billing-policy",
  "cooperative-disclosures",
] as const

type PublicPage = (typeof requiredPublicPages)[number]
type Publications = Record<PublicPage, PolicyPublication>
type Fetcher = typeof fetch

export type PublicPagesPreflightResult = {
  origin: string
  ready: boolean
  checks: { path: string; ready: boolean; reason: string }[]
}

function robotsDisallowIndex(html: string, header: string | null) {
  if (/\bnoindex\b/i.test(header ?? "")) return true
  const metas = html.match(/<meta\b[^>]*>/gi) ?? []
  return metas.some(
    (meta) =>
      /\bname\s*=\s*["']robots["']/i.test(meta) && /\bnoindex\b/i.test(meta)
  )
}

async function checkPage(
  origin: string,
  page: PublicPage,
  fetcher: Fetcher,
  publications: Publications,
  now: Date
) {
  const path = `/${page}`
  const publication = publications[page]
  if (!isApprovedPublicPolicy(page, publication, publicPolicies[page], now))
    return { path, ready: false, reason: "source-policy-not-effective" }
  if (publication.status !== "published")
    return { path, ready: false, reason: "source-policy-not-effective" }
  try {
    const response = await fetcher(`${origin}${path}`, {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    })
    if (response.status !== 200)
      return { path, ready: false, reason: `http-${response.status}` }
    if (!response.headers.get("content-type")?.includes("text/html"))
      return { path, ready: false, reason: "not-html" }
    const html = await response.text()
    if (robotsDisallowIndex(html, response.headers.get("x-robots-tag")))
      return { path, ready: false, reason: "not-publicly-effective" }
    if (
      !html.includes("HalaalVest") ||
      !html.includes(publicPolicies[page].title) ||
      !html.includes(
        `data-policy-approval-hash="${publication.approvedSnapshotHash}"`
      )
    )
      return { path, ready: false, reason: "policy-page-unrecognized" }
    if (
      page === "delete-account" &&
      (!html.includes("Start an account deletion request") ||
        !html.includes("Email verification link") ||
        !html.includes("<form"))
    )
      return { path, ready: false, reason: "deletion-form-unavailable" }
    return { path, ready: true, reason: "public-page-ready" }
  } catch {
    return { path, ready: false, reason: "unreachable" }
  }
}

async function checkLegalBundle(
  origin: string,
  fetcher: Fetcher,
  publications: Publications,
  now: Date
) {
  const path = "/api/legal"
  if (
    !(["terms", "privacy"] as const).every((page) =>
      isApprovedPublicPolicy(
        page,
        publications[page],
        publicPolicies[page],
        now
      )
    )
  )
    return { path, ready: false, reason: "source-policy-not-effective" }
  try {
    const response = await fetcher(`${origin}${path}`, {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    })
    if (response.status !== 200)
      return { path, ready: false, reason: `http-${response.status}` }
    const bundle: unknown = await response.json()
    if (!bundle || typeof bundle !== "object")
      return { path, ready: false, reason: "legal-bundle-invalid" }
    const value = bundle as Record<string, unknown>
    if (
      value.available !== true ||
      value.acceptanceRequired !== true ||
      !Array.isArray(value.documents)
    )
      return { path, ready: false, reason: "legal-bundle-not-effective" }
    const documents = value.documents as Record<string, unknown>[]
    const types = new Set(documents.map((item) => item.documentType))
    if (
      documents.length !== 2 ||
      !types.has("terms") ||
      !types.has("privacy") ||
      !documents.every((item) => {
        if (item.documentType !== "terms" && item.documentType !== "privacy")
          return false
        const publication = publications[item.documentType]
        return (
          publication.status === "published" &&
          item.documentVersion === publication.version &&
          item.contentHash === publication.approvedSnapshotHash &&
          item.url === `${origin}/${item.documentType}`
        )
      })
    )
      return { path, ready: false, reason: "legal-bundle-invalid" }
    return { path, ready: true, reason: "legal-bundle-ready" }
  } catch {
    return { path, ready: false, reason: "unreachable" }
  }
}

async function checkDeletionVerificationPage(
  origin: string,
  fetcher: Fetcher,
  publications: Publications,
  now: Date
) {
  const path = "/delete-account/verify"
  const challengePath = `${path}?challenge=00000000-0000-4000-8000-000000000000`
  if (
    !isApprovedPublicPolicy(
      "delete-account",
      publications["delete-account"],
      publicPolicies["delete-account"],
      now
    )
  )
    return { path, ready: false, reason: "source-policy-not-effective" }
  try {
    const response = await fetcher(`${origin}${path}`, {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    })
    if (response.status !== 200)
      return { path, ready: false, reason: `http-${response.status}` }
    if (!response.headers.get("content-type")?.includes("text/html"))
      return { path, ready: false, reason: "not-html" }
    if (!/\bno-store\b/i.test(response.headers.get("cache-control") ?? ""))
      return { path, ready: false, reason: "deletion-verification-cacheable" }
    if (
      response.headers.get("referrer-policy")?.trim().toLowerCase() !==
      "no-referrer"
    )
      return { path, ready: false, reason: "deletion-verification-referrer" }
    const html = await response.text()
    if (
      !html.includes("Verify account deletion request") ||
      !html.includes("This verification link is incomplete") ||
      !html.includes("Request a new link")
    )
      return {
        path,
        ready: false,
        reason: "deletion-verification-unrecognized",
      }
    if (!robotsDisallowIndex(html, response.headers.get("x-robots-tag")))
      return { path, ready: false, reason: "deletion-verification-indexable" }
    const challengeResponse = await fetcher(`${origin}${challengePath}`, {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    })
    if (challengeResponse.status !== 200)
      return {
        path,
        ready: false,
        reason: `deletion-challenge-http-${challengeResponse.status}`,
      }
    if (!challengeResponse.headers.get("content-type")?.includes("text/html"))
      return { path, ready: false, reason: "deletion-challenge-not-html" }
    if (
      !/\bno-store\b/i.test(
        challengeResponse.headers.get("cache-control") ?? ""
      )
    )
      return { path, ready: false, reason: "deletion-challenge-cacheable" }
    if (
      challengeResponse.headers.get("referrer-policy")?.trim().toLowerCase() !==
      "no-referrer"
    )
      return { path, ready: false, reason: "deletion-challenge-referrer" }
    const challengeHtml = await challengeResponse.text()
    if (
      !challengeHtml.includes("Verify account deletion request") ||
      !challengeHtml.includes(publicDeletionFlowCopy.verification.checking)
    )
      return { path, ready: false, reason: "deletion-challenge-unrecognized" }
    if (
      !robotsDisallowIndex(
        challengeHtml,
        challengeResponse.headers.get("x-robots-tag")
      )
    )
      return { path, ready: false, reason: "deletion-challenge-indexable" }
    return { path, ready: true, reason: "deletion-verification-ready" }
  } catch {
    return { path, ready: false, reason: "unreachable" }
  }
}

export async function inspectPublicPages(
  configuredOrigin: string,
  fetcher: Fetcher = fetch,
  publications: Publications = policyPublications,
  now = new Date()
): Promise<PublicPagesPreflightResult> {
  const origin = trustedExternalDeletionOrigin({
    marketingAppUrl: configuredOrigin,
  })
  const checks = await Promise.all([
    ...requiredPublicPages.map((page) =>
      checkPage(origin, page, fetcher, publications, now)
    ),
    checkDeletionVerificationPage(origin, fetcher, publications, now),
    checkLegalBundle(origin, fetcher, publications, now),
  ])
  return { origin, ready: checks.every((check) => check.ready), checks }
}

if (import.meta.main) {
  const configuredOrigin = process.argv[2]
  if (!configuredOrigin) {
    console.error(
      "Usage: bun scripts/public-pages-preflight.ts <public-origin>"
    )
    process.exit(1)
  }
  try {
    const result = await inspectPublicPages(configuredOrigin)
    console.log(JSON.stringify(result, null, 2))
    if (!result.ready) process.exitCode = 1
  } catch {
    console.error("Public pages preflight failed: invalid origin")
    process.exitCode = 1
  }
}
