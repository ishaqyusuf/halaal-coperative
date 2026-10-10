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

export function isPublicPolicyEffective(policy: keyof typeof publicPolicies) {
  return isApprovedPublicPolicy(
    policy,
    policyPublications[policy],
    publicPolicies[policy]
  )
}
