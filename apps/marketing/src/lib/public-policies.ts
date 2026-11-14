export {
  publicPolicies,
  publicPolicyRevision,
  publicPolicyStatus,
  publicDeletionFlowCopy,
  policyPublications,
  type PublicPolicy,
} from "@halaalvest/domain/public-policies"

import {
  publicPolicies,
  policyPublications,
} from "@halaalvest/domain/public-policies"
import { isApprovedPublicPolicy } from "@halaalvest/db"
import { connection } from "next/server"

export function isPublicPolicyEffective(policy: keyof typeof publicPolicies) {
  return isApprovedPublicPolicy(
    policy,
    policyPublications[policy],
    publicPolicies[policy]
  )
}

export async function keepScheduledPolicyRequestTime(
  policy: keyof typeof publicPolicies
) {
  const publication = policyPublications[policy]
  if (
    publication.status === "published" &&
    Date.parse(publication.effectiveAt) > Date.now()
  ) {
    await connection()
  }
}
