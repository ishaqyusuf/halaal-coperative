"use client"

import { useRef, useState } from "react"
import { Input } from "@halaalvest/ui/components/input"
import type { DashboardUploadPurpose } from "@/lib/uploads/local-upload-storage"

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
    const formData = new FormData()
    formData.set("file", file)
    formData.set("purpose", purpose)

    setError(null)
    setIsUploading(true)

    try {
      const response = await fetch("/api/uploads", {
        body: formData,
        method: "POST",
      })
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
        <span>{isUploading ? "Uploading..." : "PDF, image, CSV, or text up to 10 MB."}</span>
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
