"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import type {
  getPublishedLegalBundle,
  listOwnLegalAcceptances,
} from "@halaalvest/db"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@halaalvest/ui/components/alert-dialog"
import { Button } from "@halaalvest/ui/components/button"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import { WorkspacePageShell } from "@/components/dashboard"
import { useTRPC } from "@/trpc/client"

type Bundle = ReturnType<typeof getPublishedLegalBundle>
type Records = Awaited<ReturnType<typeof listOwnLegalAcceptances>>

export function PlatformDocumentsView({
  bundle,
  records,
}: {
  bundle: Bundle
  records: Records | null
}) {
  const router = useRouter()
  const trpc = useTRPC()
  const accept = useMutation(trpc.legal.accept.mutationOptions())
  const busy = useRef(false)
  const [reviewed, setReviewed] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const current =
    bundle.available &&
    records !== null &&
    bundle.documents.every((document) =>
      records.some(
        (record) =>
          record.documentType === document.documentType &&
          record.documentVersion === document.documentVersion &&
          record.contentHash === document.contentHash
      )
    )

  async function recordAcknowledgement() {
    if (
      !bundle.available ||
      records === null ||
      current ||
      !reviewed ||
      !confirming ||
      busy.current
    )
      return
    busy.current = true
    setError(null)
    setMessage(null)
    try {
      await accept.mutateAsync({
        surface: "web_account",
        acknowledgement: {
          confirmed: true,
          documents: bundle.documents.map(
            ({ documentType, documentVersion, contentHash }) => ({
              documentType,
              documentVersion,
              contentHash,
            })
          ),
        },
      })
      setReviewed(false)
      setConfirming(false)
      setMessage("Your platform document acknowledgement was recorded.")
      router.refresh()
    } catch {
      setReviewed(false)
      setConfirming(false)
      setError(
        "Documents may have changed or could not be recorded. Refresh and review the latest versions."
      )
      router.refresh()
    } finally {
      busy.current = false
    }
  }

  return (
    <WorkspacePageShell
      description="Review the platform terms and privacy notice for your account."
      eyebrow="Account"
      title="Platform documents"
    >
      {records === null ? (
        <div className="space-y-3" role="alert">
          <p>
            Acceptance records could not be loaded. Recording is unavailable.
          </p>
          <Button onClick={() => router.refresh()} variant="outline">
            Retry
          </Button>
        </div>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      {message ? <p role="status">{message}</p> : null}
      {!bundle.available ? (
        <p className="text-sm text-muted-foreground">
          {bundle.acceptanceRequired
            ? "Approved current documents are temporarily unavailable. Try again later."
            : "These platform documents are review drafts. There is nothing to accept yet."}
        </p>
      ) : null}
      {bundle.documents.map((document) => (
        <section
          className="space-y-4 rounded-xl border border-border p-5"
          key={document.documentType}
        >
          <h2 className="text-lg font-semibold">
            {document.contentSnapshot.title}
          </h2>
          <p className="text-sm text-muted-foreground">
            Version {document.documentVersion} · Effective{" "}
            {new Date(document.contentSnapshot.effectiveAt)
              .toISOString()
              .slice(0, 10)}
          </p>
          <p className="whitespace-pre-wrap">
            {document.contentSnapshot.introduction}
          </p>
          {document.contentSnapshot.sections.map((section) => (
            <div className="space-y-2" key={section.title}>
              <h3 className="font-semibold">{section.title}</h3>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {section.body}
              </p>
            </div>
          ))}
        </section>
      ))}
      {current ? (
        <p role="status">
          Your acceptance of the current terms and acknowledgement of the
          current privacy notice are recorded.
        </p>
      ) : null}
      {bundle.available && records !== null && !current ? (
        <div className="space-y-4">
          <label className="flex items-start gap-3 text-sm">
            <Checkbox
              checked={reviewed}
              disabled={accept.isPending}
              onCheckedChange={(value) => setReviewed(value === true)}
            />
            <span>
              I accept the platform terms and acknowledge that I have read the
              privacy notice shown above.
            </span>
          </label>
          <Button
            disabled={!reviewed || accept.isPending}
            onClick={() => setConfirming(true)}
          >
            Review and record
          </Button>
        </div>
      ) : null}
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Record platform documents?</AlertDialogTitle>
            <AlertDialogDescription>
              Your acceptance of the terms and acknowledgement of the privacy
              notice will be recorded with these exact versions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="space-y-1 text-sm">
            {bundle.documents.map((document) => (
              <li key={document.documentType}>
                {document.contentSnapshot.title} · Version{" "}
                {document.documentVersion}
              </li>
            ))}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={accept.isPending}>
              Review documents
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!reviewed || accept.isPending}
              onClick={() => void recordAcknowledgement()}
            >
              Record acknowledgement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </WorkspacePageShell>
  )
}
