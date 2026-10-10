"use client"
import Link from "next/link"
import { useState } from "react"
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import { useTRPC } from "@/trpc/client"
import { PrivacyProcessingCountList } from "./privacy-processing-count-list"
import { PrivacyQueueLoadMore } from "./privacy-queue-load-more"

const processingCategories = {
  member_profile_documents: "Member profile and documents",
  shared_financial_records: "Shared financial records",
  support_notifications_audit: "Support, notifications and audit",
  private_uploads: "Private uploads",
  legal_store_records: "Legal and store records",
  external_processors_backups: "External processors and backups",
  completion_contact: "Completion contact",
} as const

function ProcessingInventory({ requestId }: { requestId: string }) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [category, setCategory] = useState<keyof typeof processingCategories>(
    "member_profile_documents"
  )
  const [evidence, setEvidence] = useState("")
  const inventory = useQuery(
    trpc.accountPrivacy.processingInventory.queryOptions({ requestId })
  )
  const recordNote = useMutation(
    trpc.accountPrivacy.recordProcessingNote.mutationOptions({
      onSuccess: async () => {
        setEvidence("")
        await queryClient.invalidateQueries(
          trpc.accountPrivacy.processingInventory.queryFilter({ requestId })
        )
      },
    })
  )
  if (inventory.isPending)
    return <p role="status">Loading linked-record inventory…</p>
  if (inventory.isError)
    return (
      <div role="alert" className="space-y-2">
        <p>Linked-record inventory could not be loaded.</p>
        <Button variant="outline" onClick={() => void inventory.refetch()}>
          Retry
        </Button>
      </div>
    )
  return (
    <div className="space-y-3 rounded-lg bg-muted p-4 text-sm">
      <PrivacyProcessingCountList counts={inventory.data.counts} />
      <div className="space-y-3 border-t border-border pt-4">
        <p className="font-medium">Restricted processing notes</p>
        {inventory.data.notes.length ? (
          <ol className="space-y-3">
            {inventory.data.notes.map((note, index) => (
              <li className="rounded-md border border-border p-3" key={index}>
                <p className="font-medium">
                  {processingCategories[note.category]}
                </p>
                <p className="break-words whitespace-pre-wrap">
                  {note.evidence}
                </p>
                <p className="text-xs text-muted-foreground">
                  Recorded {new Date(note.recordedAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-muted-foreground">No processing notes recorded.</p>
        )}
        <label
          className="block font-medium"
          htmlFor={`privacy-category-${requestId}`}
        >
          Review category
        </label>
        <select
          className="w-full rounded-md border border-input bg-background p-2"
          id={`privacy-category-${requestId}`}
          onChange={(event) =>
            setCategory(event.target.value as keyof typeof processingCategories)
          }
          value={category}
        >
          {Object.entries(processingCategories).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <label
          className="block font-medium"
          htmlFor={`privacy-evidence-${requestId}`}
        >
          Action or outcome evidence
        </label>
        <Textarea
          id={`privacy-evidence-${requestId}`}
          maxLength={2000}
          minLength={20}
          onChange={(event) => setEvidence(event.target.value)}
          placeholder="Record the system or processor, action, reference and result. Do not enter passwords or identity-document numbers."
          value={evidence}
        />
        <p className="text-muted-foreground">
          Recording evidence does not erase records or complete the request.
        </p>
        {recordNote.isError ? (
          <p role="alert" className="text-destructive">
            Evidence could not be saved. Refresh the request and try again.
          </p>
        ) : null}
        <Button
          disabled={recordNote.isPending || evidence.trim().length < 20}
          onClick={() =>
            recordNote.mutate({
              requestId,
              category,
              evidence: evidence.trim(),
            })
          }
        >
          {recordNote.isPending ? "Recording…" : "Record processing evidence"}
        </Button>
      </div>
    </div>
  )
}

export function PlatformPrivacyRequestsView() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const queue = useInfiniteQuery(
    trpc.accountPrivacy.operatorQueue.infiniteQueryOptions(
      {},
      { getNextPageParam: ({ meta }) => meta.cursor ?? undefined }
    )
  )
  const requests = queue.data?.pages.flatMap((page) => page.data) ?? []
  const [selected, setSelected] = useState<string | null>(null)
  const [evidence, setEvidence] = useState("")
  const [revokeSelected, setRevokeSelected] = useState<string | null>(null)
  const [handoverEvidence, setHandoverEvidence] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [reviewedMembershipIds, setReviewedMembershipIds] = useState<string[]>(
    []
  )
  const revocationScope = useQuery({
    ...trpc.accountPrivacy.revocationScope.queryOptions({
      requestId: revokeSelected ?? "00000000-0000-0000-0000-000000000000",
    }),
    enabled: !!revokeSelected,
  })
  const [inventorySelected, setInventorySelected] = useState<string | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)
  const verify = useMutation(
    trpc.accountPrivacy.verify.mutationOptions({
      onSuccess: async () => {
        setSelected(null)
        setEvidence("")
        setError(null)
        await queryClient.invalidateQueries(
          trpc.accountPrivacy.operatorQueue.queryFilter()
        )
      },
      onError: () =>
        setError(
          "Verification could not be recorded. Refresh the request and try again."
        ),
    })
  )
  const revokeAccess = useMutation(
    trpc.accountPrivacy.revokeAccess.mutationOptions({
      onSuccess: async () => {
        setRevokeSelected(null)
        setHandoverEvidence("")
        setConfirmation("")
        setReviewedMembershipIds([])
        setError(null)
        await queryClient.invalidateQueries(
          trpc.accountPrivacy.operatorQueue.queryFilter()
        )
      },
      onError: async () => {
        setReviewedMembershipIds([])
        setError(
          "Access could not be revoked. Review the current cooperative access and administrator handover again."
        )
        await queryClient.invalidateQueries(
          trpc.accountPrivacy.revocationScope.queryFilter()
        )
      },
    })
  )
  return (
    <WorkspacePageShell
      eyebrow="Platform privacy"
      title="Privacy requests"
      description="Verify identity and scope before access changes. Completion requires a separate retention and processor review."
    >
      <Link
        className="text-sm font-medium underline underline-offset-4"
        href="/platform/refund-reviews"
      >
        Open Google refund reviews
      </Link>
      {queue.isLoading ? <p role="status">Loading privacy requests…</p> : null}
      {queue.isError ? (
        <div role="alert" className="space-y-2">
          <p>Privacy requests could not be loaded.</p>
          <Button variant="outline" onClick={() => void queue.refetch()}>
            Retry
          </Button>
        </div>
      ) : null}
      {queue.data && requests.length === 0 ? (
        <WorkspaceEmptyState
          title="No open privacy requests"
          body="New account deletion requests will appear here for platform review."
        />
      ) : null}
      <div className="space-y-4">
        {requests.map((request) => (
          <section
            className="space-y-3 rounded-xl border border-border p-5"
            key={request.id}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">
                  {request.user?.fullName ?? "Account holder"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {request.user?.email ?? "Account contact unavailable"}
                </p>
              </div>
              <span className="text-sm font-medium capitalize">
                {request.status.replaceAll("_", " ")}
              </span>
            </div>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Reference</dt>
                <dd className="font-mono text-xs break-all">{request.id}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Submitted</dt>
                <dd>{new Date(request.requestedAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Workspace ID</dt>
                <dd className="font-mono text-xs break-all">
                  {request.tenantId}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Support case</dt>
                <dd className="font-mono text-xs break-all">
                  {request.supportCaseId ?? "Unavailable"}
                </dd>
              </div>
            </dl>
            {request.verificationEvidence ? (
              <p className="text-sm">
                <strong>Verification evidence:</strong>{" "}
                {request.verificationEvidence}
              </p>
            ) : null}
            {request.accessRevokedAt ? (
              <p className="text-sm">
                Account access ended{" "}
                {new Date(request.accessRevokedAt).toLocaleString()}. Erasure
                and retention processing remains open.
              </p>
            ) : null}
            {request.status === "processing" ? (
              <div className="space-y-3">
                <Button
                  variant="outline"
                  onClick={() =>
                    setInventorySelected(
                      inventorySelected === request.id ? null : request.id
                    )
                  }
                >
                  {inventorySelected === request.id
                    ? "Hide linked records"
                    : "Review linked records"}
                </Button>
                {inventorySelected === request.id ? (
                  <ProcessingInventory requestId={request.id} />
                ) : null}
              </div>
            ) : null}
            {selected === request.id ? (
              <div className="space-y-3 rounded-lg bg-muted p-4">
                <label
                  className="block text-sm font-medium"
                  htmlFor={`verify-${request.id}`}
                >
                  Document identity and request-scope checks
                </label>
                <Textarea
                  id={`verify-${request.id}`}
                  maxLength={2000}
                  minLength={20}
                  onChange={(event) => setEvidence(event.target.value)}
                  placeholder="Record how the account holder and the requested scope were verified; do not include passwords or identity-document numbers."
                  value={evidence}
                />
                <p className="text-xs text-muted-foreground">
                  This records verification only. It does not delete the
                  account.
                </p>
                {error ? (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                ) : null}
                <div className="flex gap-2">
                  <Button
                    disabled={verify.isPending || evidence.trim().length < 20}
                    onClick={() =>
                      verify.mutate({
                        requestId: request.id,
                        verificationEvidence: evidence.trim(),
                      })
                    }
                  >
                    {verify.isPending ? "Recording…" : "Record verification"}
                  </Button>
                  <Button
                    disabled={verify.isPending}
                    variant="outline"
                    onClick={() => {
                      setSelected(null)
                      setEvidence("")
                      setError(null)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}
            {revokeSelected === request.id ? (
              <div className="space-y-3 rounded-lg border border-destructive/40 p-4">
                <p className="text-sm font-semibold">
                  Revoke this person’s access across all cooperatives
                </p>
                <p className="text-sm text-muted-foreground">
                  This removes sign-in credentials, mobile sessions and push
                  registrations, and anonymises account identifiers. It does not
                  erase shared financial records, cancel store subscriptions or
                  complete the deletion request. The server blocks revocation of
                  the last cooperative administrator or platform owner.
                </p>
                {revocationScope.isPending || revocationScope.isFetching ? (
                  <p role="status" className="text-sm">
                    Loading current cooperative access…
                  </p>
                ) : null}
                {revocationScope.isError ? (
                  <div role="alert" className="space-y-2 text-sm">
                    <p className="text-destructive">
                      Cooperative access could not be loaded.
                    </p>
                    <Button
                      onClick={() => void revocationScope.refetch()}
                      variant="outline"
                    >
                      Retry scope review
                    </Button>
                  </div>
                ) : null}
                {revocationScope.data?.requestId === request.id &&
                !revocationScope.isFetching ? (
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">
                      Confirm every cooperative membership affected by this
                      account-wide revocation
                    </p>
                    {revocationScope.data.memberships.length ? (
                      revocationScope.data.memberships.map((membership) => (
                        <label
                          className="flex items-start gap-2 rounded-md border border-border p-2"
                          key={membership.id}
                        >
                          <input
                            checked={reviewedMembershipIds.includes(
                              membership.id
                            )}
                            className="mt-1"
                            onChange={(event) =>
                              setReviewedMembershipIds((current) =>
                                event.target.checked
                                  ? [...current, membership.id]
                                  : current.filter((id) => id !== membership.id)
                              )
                            }
                            type="checkbox"
                          />
                          <span>
                            {membership.tenant.name} ({membership.tenant.slug})
                            — {membership.role.replaceAll("_", " ")}
                          </span>
                        </label>
                      ))
                    ) : (
                      <p className="text-muted-foreground">
                        No current cooperative memberships remain for this
                        account.
                      </p>
                    )}
                  </div>
                ) : null}
                <label
                  className="block text-sm font-medium"
                  htmlFor={`handover-${request.id}`}
                >
                  Document administration handover and retention review
                </label>
                <Textarea
                  id={`handover-${request.id}`}
                  maxLength={2000}
                  minLength={20}
                  onChange={(event) => setHandoverEvidence(event.target.value)}
                  placeholder="Record who takes over administration and which financial records need a separate retention decision. Do not enter passwords or document numbers."
                  value={handoverEvidence}
                />
                <label
                  className="block text-sm font-medium"
                  htmlFor={`confirm-${request.id}`}
                >
                  Type REVOKE ACCESS to confirm
                </label>
                <Input
                  id={`confirm-${request.id}`}
                  autoComplete="off"
                  onChange={(event) => setConfirmation(event.target.value)}
                  value={confirmation}
                />
                {error ? (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                ) : null}
                <div className="flex gap-2">
                  <Button
                    disabled={
                      revokeAccess.isPending ||
                      revocationScope.isFetching ||
                      revocationScope.data?.requestId !== request.id ||
                      reviewedMembershipIds.length !==
                        revocationScope.data.memberships.length ||
                      !revocationScope.data.memberships.every((membership) =>
                        reviewedMembershipIds.includes(membership.id)
                      ) ||
                      handoverEvidence.trim().length < 20 ||
                      confirmation !== "REVOKE ACCESS"
                    }
                    variant="destructive"
                    onClick={() =>
                      revokeAccess.mutate({
                        requestId: request.id,
                        confirmed: true,
                        handoverAndRetentionEvidence: handoverEvidence.trim(),
                        reviewedMemberships:
                          revocationScope.data?.memberships
                            .filter((membership) =>
                              reviewedMembershipIds.includes(membership.id)
                            )
                            .map(({ id, tenantId, role }) => ({
                              id,
                              tenantId,
                              role,
                            })) ?? [],
                      })
                    }
                  >
                    {revokeAccess.isPending ? "Revoking…" : "Revoke access"}
                  </Button>
                  <Button
                    disabled={revokeAccess.isPending}
                    variant="outline"
                    onClick={() => {
                      setRevokeSelected(null)
                      setHandoverEvidence("")
                      setConfirmation("")
                      setReviewedMembershipIds([])
                      setError(null)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}
            {(["submitted", "awaiting_information"] as string[]).includes(
              request.status
            ) && selected !== request.id ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSelected(request.id)
                  setEvidence("")
                  setError(null)
                }}
              >
                Review identity and scope
              </Button>
            ) : null}
            {request.status === "verified" &&
            !request.accessRevokedAt &&
            revokeSelected !== request.id ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSelected(null)
                  setRevokeSelected(request.id)
                  setHandoverEvidence("")
                  setConfirmation("")
                  setReviewedMembershipIds([])
                  setError(null)
                }}
              >
                Review access revocation
              </Button>
            ) : null}
          </section>
        ))}
        <PrivacyQueueLoadMore
          hasNextPage={Boolean(queue.hasNextPage)}
          isFetchingNextPage={queue.isFetchingNextPage}
          isFetchNextPageError={queue.isFetchNextPageError}
          onLoadMore={() => void queue.fetchNextPage()}
        />
      </div>
    </WorkspacePageShell>
  )
}
