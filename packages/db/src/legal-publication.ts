import { createHash } from "node:crypto"
import { AppError } from "@halaalvest/errors"
import { getMarketingConfig } from "@halaalvest/domain"
import {
  policyPublications,
  publicDeletionFlowCopy,
  publicPolicies,
  requiredPlatformPolicyTypes,
  type PolicyPublication,
  type PublicPolicy,
} from "@halaalvest/domain/public-policies"

export type LegalReference = {
  documentType: "terms" | "privacy"
  documentVersion: string
  contentHash: string
}
export type LegalAcknowledgement = {
  confirmed: true
  documents: LegalReference[]
}
type ApprovedPublication = Extract<PolicyPublication, { status: "published" }>
type PublicPolicyType = keyof typeof publicPolicies
function policySnapshot(
  documentType: PublicPolicyType,
  publication: Pick<
    ApprovedPublication,
    "version" | "effectiveAt" | "approvedAt" | "approvalReference"
  >,
  policy: PublicPolicy
) {
  return {
    documentType,
    documentVersion: publication.version,
    effectiveAt: publication.effectiveAt,
    approvedAt: publication.approvedAt,
    approvalReference: publication.approvalReference,
    ...policy,
  }
}
export function publicPolicyApprovalHash(
  documentType: PublicPolicyType,
  publication: Pick<
    ApprovedPublication,
    "version" | "effectiveAt" | "approvedAt" | "approvalReference"
  >,
  policy: PublicPolicy
) {
  return createHash("sha256")
    .update(JSON.stringify(policySnapshot(documentType, publication, policy)))
    .digest("hex")
}
export const legalPolicyApprovalHash = publicPolicyApprovalHash
export function isApprovedPublicPolicy(
  documentType: PublicPolicyType,
  publication: PolicyPublication,
  policy: PublicPolicy,
  now = new Date()
) {
  return (
    publication.status === "published" &&
    (documentType !== "delete-account" ||
      JSON.stringify(policy.interactiveCopy) ===
        JSON.stringify(publicDeletionFlowCopy)) &&
    Boolean(publication.version.trim()) &&
    Boolean(publication.approvalReference.trim()) &&
    /^[0-9a-f]{64}$/.test(publication.approvedSnapshotHash) &&
    Number.isFinite(Date.parse(publication.approvedAt)) &&
    Date.parse(publication.approvedAt) <= now.getTime() &&
    Number.isFinite(Date.parse(publication.effectiveAt)) &&
    Date.parse(publication.effectiveAt) >= Date.parse(publication.approvedAt) &&
    Date.parse(publication.effectiveAt) <= now.getTime() &&
    publication.approvedSnapshotHash ===
      publicPolicyApprovalHash(documentType, publication, policy)
  )
}
export function buildPublishedLegalDocuments(
  publications: Record<
    "terms" | "privacy",
    PolicyPublication
  > = policyPublications,
  policies: Record<"terms" | "privacy", PublicPolicy> = publicPolicies,
  now = new Date()
) {
  return requiredPlatformPolicyTypes.flatMap((documentType) => {
    const publication = publications[documentType]
    if (
      !isApprovedPublicPolicy(
        documentType,
        publication,
        policies[documentType],
        now
      )
    )
      return []
    if (publication.status !== "published") return []
    const contentSnapshot = policySnapshot(
      documentType,
      publication,
      policies[documentType]
    )
    const contentHash = publication.approvedSnapshotHash
    return [
      {
        documentType,
        documentVersion: publication.version,
        contentHash,
        contentSnapshot,
        action:
          documentType === "privacy" ? "acknowledge_notice" : "accept_terms",
        url: `https://halaalvest.com/${documentType}`,
      },
    ]
  })
}
export function validateLegalAcknowledgement(
  acknowledgement: LegalAcknowledgement | undefined,
  documents = buildPublishedLegalDocuments()
) {
  if (documents.length !== requiredPlatformPolicyTypes.length)
    throw new AppError({
      code: "PRECONDITION_FAILED",
      publicMessage:
        "Approved platform terms and privacy notice are not yet available for acceptance.",
    })
  if (
    !acknowledgement?.confirmed ||
    acknowledgement.documents.length !== documents.length ||
    !documents.every(
      (document) =>
        acknowledgement.documents.filter(
          (ref) =>
            ref.documentType === document.documentType &&
            ref.documentVersion === document.documentVersion &&
            ref.contentHash === document.contentHash
        ).length === 1
    )
  ) {
    throw new AppError({
      code: "PRECONDITION_FAILED",
      publicMessage:
        "Review the current platform terms and privacy notice before continuing.",
    })
  }
  return documents
}
export function getPublishedLegalBundle({
  launchReady = getMarketingConfig().isLaunchReady,
}: { launchReady?: boolean } = {}) {
  const documents = buildPublishedLegalDocuments()
  const available = documents.length === requiredPlatformPolicyTypes.length
  return {
    available,
    acceptanceRequired:
      launchReady ||
      requiredPlatformPolicyTypes.some(
        (type) => policyPublications[type].status === "published"
      ),
    documents: available ? documents : [],
  }
}
