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
    "Confirm hello@halaalvest.com is read on working days with a two-working-day reply target, no round-the-clock support, and the cooperative-first route for money questions.",
  "delete-account":
    "Approve the close-my-account model: identity check, cooperative settles money first (guarantees may block), login closed, contact/ID/KYC details erased, money records kept under the member's name and number for the legal period, 30-day target and email confirmation. Keep draft until the Close my account rename (Phase B) lands; its form copy is part of this hash.",
  "billing-policy":
    "Confirm the prices, billing from the joining month with no free trial, bill due on issue, no late fees or interest, suspension only after notice, refunds only for overcharges or double payments, disputes by email, and 30 days' notice of price changes.",
  "cooperative-disclosures":
    "Confirm that HalaalVest is not a bank, lender, deposit-taker or adviser and holds no member money; the financing, guarantor, Shariah-claim and no-NDIC-cover wording; and the state registering authority as the escalation route.",
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
