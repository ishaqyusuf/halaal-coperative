"use client"
import { useEffect, useState } from "react"
import type {
  getPublishedLegalBundle,
  LegalAcknowledgement,
} from "@halaalvest/db"

type Bundle = ReturnType<typeof getPublishedLegalBundle>
export function PlatformLegalAcceptance({
  onChange,
}: {
  onChange: (value: {
    ready: boolean
    acknowledgement?: LegalAcknowledgement
  }) => void
}) {
  const [bundle, setBundle] = useState<Bundle | null>(null)
  const [checked, setChecked] = useState(false)
  const [failed, setFailed] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setFailed(false)
    setChecked(false)
    setBundle(null)
    onChange({ ready: false })
    void fetch("/api/legal", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unavailable")
        const next = (await response.json()) as Bundle
        if (active) {
          setBundle(next)
          onChange({ ready: !next.acceptanceRequired })
        }
      })
      .catch(() => {
        if (active) setFailed(true)
      })
    return () => {
      active = false
    }
  }, [retry, onChange])
  if (failed)
    return (
      <div role="alert">
        <p>Platform documents could not be loaded.</p>
        <button
          type="button"
          className="underline"
          onClick={() => setRetry((value) => value + 1)}
        >
          Retry
        </button>
      </div>
    )
  if (!bundle) return <p role="status">Loading platform documents…</p>
  if (!bundle.available && bundle.acceptanceRequired)
    return (
      <p role="alert">
        The current platform documents are not yet available for acceptance.
        Please try again later.
      </p>
    )
  if (!bundle.available)
    return (
      <p className="text-sm text-muted-foreground">
        The{" "}
        <a href="/terms" target="_blank" rel="noreferrer" className="underline">
          platform terms
        </a>{" "}
        and{" "}
        <a
          href="/privacy"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          privacy notice
        </a>{" "}
        are review drafts. No contractual acceptance is recorded at this stage.
      </p>
    )
  return (
    <div className="space-y-4">
      {bundle.documents.map((document) => (
        <details key={document.documentType} className="rounded-lg border p-4">
          <summary className="cursor-pointer font-medium">
            {document.contentSnapshot.title} · {document.documentVersion}
          </summary>
          <div className="mt-3 space-y-3">
            <p>{document.contentSnapshot.introduction}</p>
            {document.contentSnapshot.sections.map((section) => (
              <section key={section.title}>
                <h3 className="font-semibold">{section.title}</h3>
                <p>{section.body}</p>
              </section>
            ))}
          </div>
        </details>
      ))}
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => {
            const value = event.currentTarget.checked
            setChecked(value)
            onChange({
              ready: value,
              acknowledgement: value
                ? {
                    confirmed: true,
                    documents: bundle.documents.map(
                      ({ documentType, documentVersion, contentHash }) => ({
                        documentType,
                        documentVersion,
                        contentHash,
                      })
                    ),
                  }
                : undefined,
            })
          }}
        />
        <span>
          I accept the platform terms and acknowledge that I have read the
          privacy notice.
        </span>
      </label>
    </div>
  )
}
