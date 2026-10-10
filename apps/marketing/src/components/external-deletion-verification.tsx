"use client"
import { publicDeletionFlowCopy } from "@halaalvest/domain/public-policies"
import { accountDeletionNoticeCopy } from "@halaalvest/domain/account-privacy-notice"
import { useEffect, useState } from "react"
import { StoreSubscriptionCancellationHelp } from "./store-subscription-cancellation-help"
const copy = publicDeletionFlowCopy.verification
export function AccountDeletionNoticeSummary() {
  return (
    <section aria-label="Account deletion consequences" className="space-y-3">
      <p className="leading-7">{accountDeletionNoticeCopy.scope}</p>
      <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
        {accountDeletionNoticeCopy.consequences.map((consequence) => (
          <li key={consequence}>{consequence}</li>
        ))}
      </ul>
      <StoreSubscriptionCancellationHelp />
    </section>
  )
}
export function ExternalDeletionVerification({
  challengeId,
  noticeVersion,
}: {
  challengeId: string
  noticeVersion: string
}) {
  const [token, setToken] = useState<string | null>(null)
  const [linkChecked, setLinkChecked] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [requestStatus, setRequestStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1))
    const linkToken = fragment.get("token")
    window.history.replaceState(null, "", "/delete-account/verify")
    if (linkToken && /^[A-Za-z0-9_-]{43}$/.test(linkToken)) {
      setToken((current) => current ?? linkToken)
    }
    setLinkChecked(true)
  }, [])
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!confirmed || submitting || !token) return
    setSubmitting(true)
    setError(null)
    try {
      const response = await fetch("/api/delete-account/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId,
          token,
          noticeVersion,
          confirmed: true,
        }),
      })
      if (!response.ok) throw new Error("verification failed")
      const result = (await response.json()) as {
        requestId: string
        status: string
      }
      setRequestId(result.requestId)
      setRequestStatus(result.status)
    } catch {
      setError(copy.failure)
    } finally {
      setSubmitting(false)
    }
  }
  if (requestId)
    return (
      <div role="status" className="rounded-xl border p-5">
        <h2 className="text-xl font-semibold">{copy.successTitle}</h2>
        <p className="mt-2">
          {copy.statusLabel} {requestStatus?.replaceAll("_", " ")}.{" "}
          {copy.referenceLabel}{" "}
          <span className="font-mono" aria-label="Request reference">
            {requestId}
          </span>
          . {copy.successCaveat}
        </p>
      </div>
    )
  if (!linkChecked) return <p role="status">{copy.checking}</p>
  if (!token) return <p role="alert">{copy.missing}</p>
  return (
    <form
      className="space-y-5 rounded-xl border p-5"
      onSubmit={(event) => void submit(event)}
    >
      <p className="leading-7">{copy.introduction}</p>
      <p className="text-sm leading-6 text-muted-foreground">{copy.details}</p>
      <AccountDeletionNoticeSummary />
      <label className="flex items-start gap-3 text-sm">
        <input
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          required
          type="checkbox"
        />
        <span>{copy.confirmation}</span>
      </label>
      <button
        className="min-h-11 rounded-md bg-primary px-5 py-2 text-primary-foreground disabled:opacity-60"
        disabled={!confirmed || submitting}
        type="submit"
      >
        {submitting ? copy.submittingLabel : copy.submitLabel}
      </button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  )
}
