import { describe, expect, it } from "bun:test"
import {
  buildPublishedLegalDocuments,
  getPublishedLegalBundle,
  isApprovedPublicPolicy,
  legalPolicyApprovalHash,
  publicPolicyApprovalHash,
  validateLegalAcknowledgement,
} from "./legal-publication"
import {
  publicPolicies,
  type PolicyPublication,
  type PublicPolicy,
} from "@halaalvest/domain/public-policies"
const approvalMetadata = {
  version: "2026-09-24-test",
  effectiveAt: "2026-09-23T00:00:00Z",
  approvedAt: "2026-09-22T00:00:00Z",
  approvalReference: "test-only-owner-review",
}
const approved = (
  documentType: "terms" | "privacy",
  policy: PublicPolicy
): PolicyPublication => ({
  status: "published",
  ...approvalMetadata,
  approvedSnapshotHash: legalPolicyApprovalHash(
    documentType,
    approvalMetadata,
    policy
  ),
})
const publications = {
  terms: approved("terms", publicPolicies.terms),
  privacy: approved("privacy", publicPolicies.privacy),
}
const now = new Date("2026-09-24T00:00:00Z")
const references = (
  documents: ReturnType<typeof buildPublishedLegalDocuments>
) =>
  documents.map(({ documentType, documentVersion, contentHash }) => ({
    documentType,
    documentVersion,
    contentHash,
  }))
describe("approved legal publication", () => {
  it("invalidates deletion publication when form, verification or email copy changes", () => {
    const policy = publicPolicies["delete-account"]
    const publication: PolicyPublication = {
      status: "published",
      ...approvalMetadata,
      approvedSnapshotHash: publicPolicyApprovalHash(
        "delete-account",
        approvalMetadata,
        policy
      ),
    }
    expect(
      isApprovedPublicPolicy("delete-account", publication, policy, now)
    ).toBe(true)
    expect(
      isApprovedPublicPolicy(
        "delete-account",
        publication,
        {
          ...policy,
          interactiveCopy: {
            ...policy.interactiveCopy,
            verification: {
              ...policy.interactiveCopy.verification,
              confirmation: "Changed after approval",
            },
          },
        },
        now
      )
    ).toBe(false)
    expect(
      isApprovedPublicPolicy(
        "delete-account",
        publication,
        {
          ...policy,
          interactiveCopy: {
            ...policy.interactiveCopy,
            email: {
              ...policy.interactiveCopy.email,
              bodyText: "Changed after approval",
            },
          },
        },
        now
      )
    ).toBe(false)
  })
  it("cannot approve deletion text after detaching the rendered flow copy", () => {
    const { title, introduction, sections } = publicPolicies["delete-account"]
    const detachedPolicy = { title, introduction, sections }
    const publication: PolicyPublication = {
      status: "published",
      ...approvalMetadata,
      approvedSnapshotHash: publicPolicyApprovalHash(
        "delete-account",
        approvalMetadata,
        detachedPolicy
      ),
    }
    expect(
      isApprovedPublicPolicy("delete-account", publication, detachedPolicy, now)
    ).toBe(false)
    const divergentPolicy = {
      ...publicPolicies["delete-account"],
      interactiveCopy: {
        ...publicPolicies["delete-account"].interactiveCopy,
        request: {
          ...publicPolicies["delete-account"].interactiveCopy.request,
          title: "Out-of-sync policy copy",
        },
      },
    }
    const divergentPublication: PolicyPublication = {
      status: "published",
      ...approvalMetadata,
      approvedSnapshotHash: publicPolicyApprovalHash(
        "delete-account",
        approvalMetadata,
        divergentPolicy
      ),
    }
    expect(
      isApprovedPublicPolicy(
        "delete-account",
        divergentPublication,
        divergentPolicy,
        now
      )
    ).toBe(false)
  })
  it("requires an exact effective approval snapshot for every public page", () => {
    for (const documentType of Object.keys(publicPolicies) as Array<
      keyof typeof publicPolicies
    >) {
      const policy = publicPolicies[documentType]
      const publication: PolicyPublication = {
        status: "published",
        ...approvalMetadata,
        approvedSnapshotHash: publicPolicyApprovalHash(
          documentType,
          approvalMetadata,
          policy
        ),
      }
      expect(
        isApprovedPublicPolicy(documentType, publication, policy, now)
      ).toBe(true)
      expect(
        isApprovedPublicPolicy(
          documentType,
          publication,
          {
            ...policy,
            introduction: "Changed after approval",
          },
          now
        )
      ).toBe(false)
      expect(
        isApprovedPublicPolicy(
          documentType,
          { ...publication, effectiveAt: "2026-10-01T00:00:00Z" },
          policy,
          now
        )
      ).toBe(false)
      expect(
        isApprovedPublicPolicy(
          documentType,
          {
            status: "published",
            ...approvalMetadata,
            effectiveAt: "2026-09-21T00:00:00Z",
            approvedSnapshotHash: publicPolicyApprovalHash(
              documentType,
              {
                ...approvalMetadata,
                effectiveAt: "2026-09-21T00:00:00Z",
              },
              policy
            ),
          },
          policy,
          now
        )
      ).toBe(false)
      expect(
        isApprovedPublicPolicy(
          documentType,
          { status: "draft", version: publication.version },
          policy,
          now
        )
      ).toBe(false)
    }
  })
  it("does not expose current review drafts for acceptance", () => {
    expect(getPublishedLegalBundle({ launchReady: false })).toEqual({
      available: false,
      acceptanceRequired: false,
      documents: [],
    })
    expect(getPublishedLegalBundle({ launchReady: true })).toEqual({
      available: false,
      acceptanceRequired: true,
      documents: [],
    })
    expect(() =>
      validateLegalAcknowledgement({ confirmed: true, documents: [] })
    ).toThrow("not yet available")
  })
  it("requires both documents and effective dated approval evidence", () => {
    for (const privacy of [
      { status: "draft", version: "draft" },
      { ...publications.privacy, approvalReference: " " },
      { ...publications.privacy, effectiveAt: "2026-10-01T00:00:00Z" },
      { ...publications.privacy, approvedAt: "invalid" },
      { ...publications.privacy, version: " " },
      { ...publications.privacy, version: "2026-09-24-edited" },
      { ...publications.privacy, effectiveAt: "2026-09-22T12:00:00Z" },
      { ...publications.privacy, effectiveAt: "2026-09-21T00:00:00Z" },
      { ...publications.privacy, approvedAt: "2026-09-21T00:00:00Z" },
      { ...publications.privacy, approvalReference: "edited-review" },
      { ...publications.privacy, approvedSnapshotHash: "0".repeat(64) },
    ] as PolicyPublication[]) {
      const documents = buildPublishedLegalDocuments(
        { terms: publications.terms, privacy },
        publicPolicies,
        now
      )
      expect(documents).toHaveLength(1)
      expect(() =>
        validateLegalAcknowledgement(
          { confirmed: true, documents: references(documents) },
          documents
        )
      ).toThrow("not yet available")
    }
  })
  it("records terms acceptance separately from privacy acknowledgement", () => {
    const documents = buildPublishedLegalDocuments(
      publications,
      publicPolicies,
      now
    )
    expect(documents.map((document) => document.action)).toEqual([
      "accept_terms",
      "acknowledge_notice",
    ])
    expect(
      validateLegalAcknowledgement(
        { confirmed: true, documents: references(documents) },
        documents
      )
    ).toEqual(documents)
  })
  it("rejects stale, duplicated, missing and unconfirmed references", () => {
    const documents = buildPublishedLegalDocuments(
      publications,
      publicPolicies,
      now
    )
    const refs = references(documents)
    for (const acknowledgement of [
      undefined,
      { confirmed: true, documents: [] },
      { confirmed: true, documents: [refs[0]!, refs[0]!] },
      {
        confirmed: true,
        documents: [{ ...refs[0]!, contentHash: "0".repeat(64) }, refs[1]!],
      },
      { confirmed: false, documents: refs },
    ]) {
      expect(() =>
        validateLegalAcknowledgement(acknowledgement as never, documents)
      ).toThrow("Review the current")
    }
  })
  it("withholds changed content until the exact text has fresh approval", () => {
    const original = buildPublishedLegalDocuments(
      publications,
      publicPolicies,
      now
    )
    const changed = buildPublishedLegalDocuments(
      publications,
      {
        ...publicPolicies,
        terms: { ...publicPolicies.terms, introduction: "Changed terms" },
      },
      now
    )
    expect(changed.map((document) => document.documentType)).toEqual([
      "privacy",
    ])
    expect(() =>
      validateLegalAcknowledgement(
        { confirmed: true, documents: references(original) },
        changed
      )
    ).toThrow("not yet available")
    expect(original[0]!.contentSnapshot.sections).toEqual(
      publicPolicies.terms.sections
    )
    const reapproved = buildPublishedLegalDocuments(
      {
        terms: approved("terms", {
          ...publicPolicies.terms,
          introduction: "Changed terms",
        }),
        privacy: publications.privacy,
      },
      {
        ...publicPolicies,
        terms: { ...publicPolicies.terms, introduction: "Changed terms" },
      },
      now
    )
    expect(reapproved).toHaveLength(2)
    expect(reapproved[0]!.contentHash).not.toBe(original[0]!.contentHash)
  })
})
