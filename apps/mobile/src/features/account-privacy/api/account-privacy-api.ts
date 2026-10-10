import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
export type PrivacyNotice = {
  version: string
  scope: string
  consequences: string[]
}
export type PrivacyRequest = {
  id: string
  supportCaseId: string | null
  status:
    | "submitted"
    | "verified"
    | "awaiting_information"
    | "processing"
    | "completed"
    | "rejected"
    | "cancelled"
  noticeVersion: string
  requestedAt: Date
  verifiedAt: Date | null
  accessRevokedAt: Date | null
  completionSummary: string | null
  completedAt: Date | null
  updatedAt: Date
}
export function getPrivacyNotice(): Promise<PrivacyNotice> {
  return createMobileTrpcClient().accountPrivacy.notice.query()
}
export function listPrivacyRequests(): Promise<PrivacyRequest[]> {
  return createMobileTrpcClient().accountPrivacy.list.query()
}
export function submitPrivacyRequest(input: {
  idempotencyKey: string
  noticeVersion: string
  confirmed: true
}): Promise<PrivacyRequest> {
  return createMobileTrpcClient().accountPrivacy.request.mutate(input)
}
export function cancelPrivacyRequest(
  requestId: string
): Promise<{ cancelled: boolean }> {
  return createMobileTrpcClient().accountPrivacy.cancel.mutate({ requestId })
}
