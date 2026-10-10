import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
export type LegalDocument = {
  documentType: "terms" | "privacy"
  documentVersion: string
  contentHash: string
  contentSnapshot: {
    title: string
    introduction: string
    sections: { title: string; body: string }[]
    effectiveAt: string
  }
  action: "accept_terms" | "acknowledge_notice"
  url: string
}
export type LegalBundle = {
  available: boolean
  acceptanceRequired: boolean
  documents: LegalDocument[]
}
export type LegalRecord = {
  documentType: string
  documentVersion: string
  contentHash: string
  action: string
  acceptedAt: Date
}
export function getLegalBundle(): Promise<LegalBundle> {
  return createMobileTrpcClient().legal.current.query()
}
export function getLegalRecords(): Promise<LegalRecord[]> {
  return createMobileTrpcClient().legal.accepted.query()
}
export function acceptLegalDocuments(
  documents: LegalDocument[]
): Promise<{ recorded: number }> {
  return createMobileTrpcClient().legal.accept.mutate({
    surface: "mobile_account",
    acknowledgement: {
      confirmed: true,
      documents: documents.map(
        ({ documentType, documentVersion, contentHash }) => ({
          documentType,
          documentVersion,
          contentHash,
        })
      ),
    },
  })
}
