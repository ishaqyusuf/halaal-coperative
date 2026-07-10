"use client"

import { useState } from "react"
import { UploadEvidenceInput } from "@/components/upload-evidence-input"

export function OpeningSourceDocumentFields({
  disabled,
}: {
  disabled?: boolean
}) {
  const [sourceDocumentName, setSourceDocumentName] = useState("")
  const [sourceDocumentUrl, setSourceDocumentUrl] = useState("")

  return (
    <>
      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
        Source document name
        <input
          className="h-9 border border-border bg-background px-3 text-sm text-foreground"
          disabled={disabled}
          name="sourceDocumentName"
          onChange={(event) => setSourceDocumentName(event.target.value)}
          placeholder="Opening ledger scan"
          value={sourceDocumentName}
        />
      </label>
      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
        Source document URL
        <UploadEvidenceInput
          disabled={disabled}
          fileName={sourceDocumentName}
          onUploaded={(upload) => {
            setSourceDocumentName(upload.fileName)
            setSourceDocumentUrl(upload.url)
          }}
          purpose="opening_balance_source"
          value={sourceDocumentUrl}
        />
        <input
          className="h-9 border border-border bg-background px-3 text-sm text-foreground"
          disabled={disabled}
          name="sourceDocumentUrl"
          onChange={(event) => setSourceDocumentUrl(event.target.value)}
          placeholder="https://..."
          value={sourceDocumentUrl}
        />
      </label>
    </>
  )
}
