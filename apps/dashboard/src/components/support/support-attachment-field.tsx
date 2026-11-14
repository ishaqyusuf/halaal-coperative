"use client"

import { useState } from "react"
import { isSafeSupportAttachmentUrl } from "@halaalvest/utils"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { RequestField } from "@/components/requests/request-field"
import { UploadEvidenceInput } from "@/components/upload-evidence-input"

/**
 * One optional file for a new case: upload it, or paste a link. Unsafe links
 * (see ADR-20260925) are never shown as clickable.
 */
export function SupportAttachmentField({
  disabled,
  onChange,
  value,
}: {
  disabled: boolean
  onChange: (value: string) => void
  value: string
}) {
  const [showLink, setShowLink] = useState(
    Boolean(value) && !value.startsWith("/api/uploads/")
  )
  const [fileName, setFileName] = useState<string>()
  const safeValue = isSafeSupportAttachmentUrl(value) ? value : undefined

  return (
    <div className="grid gap-3">
      <RequestField label="Attach a file" optional>
        <UploadEvidenceInput
          disabled={disabled}
          fileName={fileName}
          onUploaded={(upload) => {
            setFileName(upload.fileName)
            onChange(upload.url)
          }}
          purpose="support_attachment"
          value={safeValue}
        />
      </RequestField>
      {showLink ? (
        <RequestField
          hint="Starts with https://"
          label="Or paste a link"
          optional
        >
          <Input
            className="h-12 text-base"
            disabled={disabled}
            inputMode="url"
            onChange={(event) => onChange(event.target.value)}
            placeholder="https://"
            value={value}
          />
        </RequestField>
      ) : (
        <Button
          className="h-11 justify-self-start px-0 text-base"
          disabled={disabled}
          onClick={() => setShowLink(true)}
          type="button"
          variant="link"
        >
          Paste a link instead
        </Button>
      )}
    </div>
  )
}
