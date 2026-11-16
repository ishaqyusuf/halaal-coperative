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
import {
  SettingsEmpty,
  SettingsPage,
} from "@/components/workspace-settings/settings-page"
import { useTRPC } from "@/trpc/client"
import { formatDayMonthYear } from "@/utils/format"

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
    <SettingsPage intro="The Halaalvest terms and privacy notice for your account.">
      {records === null ? (
        <div className="space-y-3 text-base" role="alert">
          <p>We couldn&apos;t load what you have accepted. Try again.</p>
          <Button
            size="touch"
            className="text-base"
            onClick={() => router.refresh()}
            variant="outline"
          >
            Try again
          </Button>
        </div>
      ) : null}
      {error ? (
        <p className="text-base" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-base" role="status">
          {message}
        </p>
      ) : null}
      {!bundle.available ? (
        <SettingsEmpty
          body={
            bundle.acceptanceRequired
              ? "Try again later."
              : "The documents are still being written."
          }
          title={
            bundle.acceptanceRequired
              ? "The documents can't be shown right now"
              : "Nothing to accept yet"
          }
        />
      ) : null}
      {bundle.documents.map((document) => (
        <section
          className="space-y-4 rounded-xl border border-border p-4 text-base sm:p-5"
          key={document.documentType}
        >
          <h2 className="text-xl font-semibold">
            {document.contentSnapshot.title}
          </h2>
          <p className="text-muted-foreground">
            Version {document.documentVersion}, from{" "}
            {formatDayMonthYear(document.contentSnapshot.effectiveAt)}
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
        <p className="text-base" role="status">
          You have accepted the current terms and read the privacy notice.
        </p>
      ) : null}
      {bundle.available && records !== null && !current ? (
        <div className="space-y-4">
          <label className="flex min-h-11 items-start gap-3 text-base">
            <Checkbox
              className="mt-0.5 size-5"
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
            size="touch"
            className="w-full text-base sm:w-auto"
            disabled={!reviewed || accept.isPending}
            onClick={() => setConfirming(true)}
          >
            Accept
          </Button>
        </div>
      ) : null}
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accept these documents?</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              We keep a record that you accepted these versions. You can&apos;t
              undo this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="space-y-1 text-base">
            {bundle.documents.map((document) => (
              <li key={document.documentType}>
                {document.contentSnapshot.title}, version{" "}
                {document.documentVersion}
              </li>
            ))}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel
              size="touch"
              className="text-base"
              disabled={accept.isPending}
            >
              Go back
            </AlertDialogCancel>
            <AlertDialogAction
              size="touch"
              className="text-base"
              disabled={!reviewed || accept.isPending}
              onClick={() => void recordAcknowledgement()}
            >
              {accept.isPending ? "Saving…" : "Accept"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsPage>
  )
}
