"use client"

import { useRef, useState } from "react"
import { upload } from "@vercel/blob/client"
import { Input } from "@halaalvest/ui/components/input"
import { DASHBOARD_UPLOAD_MAX_SIZE_LABEL, MAX_DASHBOARD_UPLOAD_BYTES, type DashboardUploadPurpose } from "@/lib/uploads/upload-policy"

type UploadResult = {
  fileName: string
  url: string
}

export function UploadEvidenceInput({
  disabled,
  fileName,
  onUploaded,
  purpose,
  value,
}: {
  disabled?: boolean
  fileName?: string
  onUploaded: (upload: UploadResult) => void
  purpose: DashboardUploadPurpose
  value?: string
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function uploadFile(file: File) {
    if (file.size > MAX_DASHBOARD_UPLOAD_BYTES) {
      setError(`Choose a file no larger than ${DASHBOARD_UPLOAD_MAX_SIZE_LABEL}.`)
      if (inputRef.current) inputRef.current.value = ""
      return
    }
    setError(null)
    setIsUploading(true)

    try {
      const intentResponse = await fetch("/api/uploads/intent", {
        body: JSON.stringify({ purpose, contentType: file.type, size: file.size, fileName: file.name }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      })
      const intent = (await intentResponse.json()) as { error?: string; mode?: string; id?: string; pathname?: string; intent?: string }
      if (!intentResponse.ok) throw new Error(intent.error ?? "Upload unavailable.")
      let response: Response
      if (intent.mode === "private_blob" && intent.id && intent.pathname && intent.intent) {
        await upload(intent.pathname, file, {
          access: "private",
          contentType: file.type,
          handleUploadUrl: "/api/uploads/token",
          clientPayload: intent.intent,
        })
        response = await fetch("/api/uploads/finalize", {
          body: JSON.stringify({ intent: intent.intent }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        })
      } else if (intent.mode === "local") {
        const formData = new FormData()
        formData.set("file", file)
        formData.set("purpose", purpose)
        response = await fetch("/api/uploads", { body: formData, method: "POST" })
      } else {
        throw new Error("Upload service returned an invalid destination.")
      }
      const payload = (await response.json()) as Partial<UploadResult> & {
        error?: string
      }

      if (!response.ok || !payload.url || !payload.fileName) {
        throw new Error(payload.error ?? "Upload failed.")
      }

      onUploaded({
        fileName: payload.fileName,
        url: payload.url,
      })
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Upload failed."
      )
    } finally {
      setIsUploading(false)
      if (inputRef.current) {
        inputRef.current.value = ""
      }
    }
  }

  return (
    <div className="space-y-2">
      <Input
        disabled={disabled || isUploading}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            void uploadFile(file)
          }
        }}
        ref={inputRef}
        type="file"
      />
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{isUploading ? "Uploading..." : `PDF, image, CSV, or text up to ${DASHBOARD_UPLOAD_MAX_SIZE_LABEL}.`}</span>
        {value ? (
          <a
            className="inline-flex h-8 items-center justify-center border border-border bg-background px-3 text-xs font-medium text-foreground transition hover:bg-muted"
            href={value}
            rel="noreferrer"
            target="_blank"
          >
            {fileName || "Open upload"}
          </a>
        ) : null}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
