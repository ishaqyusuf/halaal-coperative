"use client"
import { publicDeletionFlowCopy } from "@halaalvest/domain/public-policies"
import { useState } from "react"
import type { QaQuickFillContext } from "@halaalvest/utils"
import { QaQuickFillButton } from "@halaalvest/ui/components/qa-quick-fill-button"
import { getDevFormDefaults } from "@/lib/dev-form-fill"
import {
  externalDeletionWorkspacePattern,
  normalizeExternalDeletionWorkspace,
} from "@/lib/external-deletion-workspace"
const copy = publicDeletionFlowCopy.request
export function ExternalDeletionRequestForm({
  quickFill,
}: {
  quickFill?: QaQuickFillContext
}) {
  const [email, setEmail] = useState("")
  const [workspaceSlug, setWorkspaceSlug] = useState("")
  const [previousDraft, setPreviousDraft] = useState<{
    email: string
    workspaceSlug: string
  } | null>(null)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending) return
    setSending(true)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch("/api/delete-account/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, workspaceSlug }),
      })
      if (!response.ok) throw new Error("unavailable")
      setMessage(copy.success)
    } catch {
      setError(copy.failure)
    } finally {
      setSending(false)
    }
  }
  return (
    <form
      className="mt-8 space-y-4 rounded-xl border p-5"
      onSubmit={(event) => void submit(event)}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-xl font-semibold">{copy.title}</h2>
        <QaQuickFillButton
          isDirty={Boolean(email || workspaceSlug)}
          qaDomain={quickFill?.emailDomain}
          visible={Boolean(quickFill?.enabled)}
          onFill={async () => {
            setPreviousDraft({ email, workspaceSlug })
            const values = await getDevFormDefaults("deletionRequest", {
              emailDomain: quickFill?.emailDomain,
            })
            setEmail(values.email)
            setWorkspaceSlug(values.workspaceSlug)
          }}
          onUndo={() => {
            setEmail(previousDraft?.email ?? "")
            setWorkspaceSlug(previousDraft?.workspaceSlug ?? "")
          }}
        />
      </div>
      <p className="text-sm text-muted-foreground">{copy.instructions}</p>
      <label className="block text-sm font-medium">
        {copy.emailLabel}
        <input
          autoComplete="email"
          className="mt-2 block w-full rounded-md border bg-background p-3"
          maxLength={254}
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </label>
      <label className="block text-sm font-medium">
        {copy.workspaceLabel}
        <input
          autoComplete="organization"
          className="mt-2 block w-full rounded-md border bg-background p-3"
          maxLength={253}
          minLength={2}
          onChange={(event) =>
            setWorkspaceSlug(
              normalizeExternalDeletionWorkspace(event.target.value)
            )
          }
          pattern={externalDeletionWorkspacePattern.source}
          placeholder={copy.workspacePlaceholder}
          required
          title="Use a workspace short address or website domain without spaces, such as amanah or cooperative.ng."
          value={workspaceSlug}
        />
      </label>
      <button
        className="min-h-11 rounded-md bg-primary px-5 py-2 text-primary-foreground disabled:opacity-60"
        disabled={sending}
        type="submit"
      >
        {sending ? copy.sendingLabel : copy.submitLabel}
      </button>
      {message ? (
        <p role="status" className="text-sm">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  )
}
