"use client"

import { useState } from "react"
import { Field, FieldLabel } from "@halaalvest/ui/components/field"
import { Input } from "@halaalvest/ui/components/input"
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
      <Field data-disabled={disabled ? true : undefined}>
        <FieldLabel htmlFor="member-opening-source-document-name">
          Source document name
        </FieldLabel>
        <Input
          disabled={disabled}
          id="member-opening-source-document-name"
          name="sourceDocumentName"
          onChange={(event) => setSourceDocumentName(event.target.value)}
          placeholder="Opening ledger scan"
          value={sourceDocumentName}
        />
      </Field>
      <Field data-disabled={disabled ? true : undefined}>
        <FieldLabel htmlFor="member-opening-source-document-url">
          Source document URL
        </FieldLabel>
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
        <Input
          disabled={disabled}
          id="member-opening-source-document-url"
          name="sourceDocumentUrl"
          onChange={(event) => setSourceDocumentUrl(event.target.value)}
          placeholder="https://..."
          value={sourceDocumentUrl}
        />
      </Field>
    </>
  )
}
