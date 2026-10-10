import { createHash } from "node:crypto"
import { readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { accountDeletionNoticeCopy } from "../packages/domain/src/modules/account-privacy-notice"
import { ACCOUNT_DELETION_NOTICE_VERSION } from "../packages/db/src/queries/account-privacy"
import {
  policyPublications,
  publicPolicies,
  publicPolicyRevision,
  type PolicyPublication,
  type PublicPolicy,
} from "../packages/domain/src/modules/public-policies"

const pageOrder = [
  "terms",
  "privacy",
  "support",
  "delete-account",
  "billing-policy",
  "cooperative-disclosures",
] as const
type Page = (typeof pageOrder)[number]
const outputPath = resolve(
  import.meta.dir,
  "../.brain/runbooks/halaalvest-public-policy-review-snapshot.md"
)

const decisionPrompts: Record<Page, string> = {
  terms:
    "Approve eligibility and minimum age, content rights, governing law, disputes, service commitments, suspension, termination, liability and export terms.",
  privacy:
    "Confirm controller/processor roles, legal bases, monitored contact, enabled processors and locations, transfers, retention by category, backup expiry and request/complaint process for each launch country.",
  support:
    "Confirm the published contact is monitored, name the escalation owner and response targets, and verify account-recovery and cooperative handoff steps.",
  "delete-account":
    "Approve identity and scope checks, administration handover, eligible-record erasure, restricted retention, processor and backup outcomes, processing timeline and completion contact. Current access revocation is not complete erasure.",
  "billing-policy":
    "Verify individual Apple/Google six-month and annual products at the owner-selected US$0.99/US$1.99 USD base prices and store-returned localized prices, storefront availability and tax; approve renewal, cancellation, refunds, failed payment, grace and account-closure handling for every mobile role.",
  "cooperative-disclosures":
    "Confirm operator and cooperative roles, funds flow, complete financing costs and guarantor duties, Halaal review claims, launch countries and any required financial-service authorisations.",
}

function sourceContentHash(policy: PublicPolicy) {
  return createHash("sha256").update(JSON.stringify(policy)).digest("hex")
}

export function renderPublicPolicyReviewPacket(
  policies: Record<Page, PublicPolicy> = publicPolicies,
  publications: Record<Page, PolicyPublication> = policyPublications,
  revision = publicPolicyRevision
) {
  const lines = [
    "# HalaalVest public policy review snapshot",
    "",
    `Source revision: \`${revision}\`. Generated from \`packages/domain/src/modules/public-policies.ts\`.`,
    "",
    "This is a review draft, not a published policy, owner/legal approval, approval hash, or evidence of a working deletion process. Every source-content SHA-256 below covers the exact JSON policy object, including deletion interactive and email copy. It deliberately excludes publication dates and approval metadata. Compare this packet with source before sign-off; run `bun scripts/public-policy-review-packet.ts --check` to detect drift.",
    "",
    "Publication requires a separate authorised review reference, approval and effective dates, an `approvedSnapshotHash` for the final source and metadata, deployment, and live route verification. Do not turn this review fingerprint into an approval hash.",
    "",
    "| Page | Source status | Source-content SHA-256 | Decision to resolve before approval |",
    "| --- | --- | --- | --- |",
    ...pageOrder.map((page) => {
      const publication = publications[page]
      const status =
        publication.status === "draft"
          ? `draft \`${publication.version}\``
          : `published \`${publication.version}\``
      return `| \`/${page}\` | ${status} | \`${sourceContentHash(policies[page])}\` | ${decisionPrompts[page]} |`
    }),
    "",
  ]
  for (const page of pageOrder) {
    const policy = policies[page]
    lines.push(`## /${page} — ${policy.title}`, "", policy.introduction, "")
    for (const section of policy.sections) {
      lines.push(`### ${section.title}`, "", section.body, "")
    }
    if (policy.interactiveCopy) {
      lines.push(
        "### Request, verification and email copy",
        "",
        "The JSON below is exact source copy used by the deletion form, verification page and verification email; review all success, failure and unavailable states.",
        "",
        "```json",
        JSON.stringify(policy.interactiveCopy, null, 2),
        "```",
        ""
      )
    }
  }
  lines.push(
    "## In-app deletion request notice",
    "",
    `Request notice version: \`${ACCOUNT_DELETION_NOTICE_VERSION}\`. This is a content fingerprint of the in-app notice and complete public deletion-policy source, not an approval or publication hash.`,
    "",
    accountDeletionNoticeCopy.scope,
    "",
    ...accountDeletionNoticeCopy.consequences.map((item) => `- ${item}`)
  )
  return `${lines.join("\n")}\n`
}

if (import.meta.main) {
  const mode = process.argv[2]
  const packet = renderPublicPolicyReviewPacket()
  if (mode === "--write") {
    await writeFile(outputPath, packet)
    console.log(`Updated ${outputPath}`)
  } else if (mode === "--print") {
    process.stdout.write(packet)
  } else if (mode === "--check") {
    const saved = await readFile(outputPath, "utf8")
    if (saved !== packet) {
      console.error("Public policy review snapshot is stale; regenerate it.")
      process.exitCode = 1
    } else {
      console.log("Public policy review snapshot matches source.")
    }
  } else {
    throw new Error(
      "Usage: bun scripts/public-policy-review-packet.ts <--write|--print|--check>"
    )
  }
}
