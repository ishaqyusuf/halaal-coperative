"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { createOwnMemberDocumentAction } from "@/lib/dashboard-actions"
import { objectToFormData } from "@/lib/form-submit"
import { UploadEvidenceInput } from "@/components/upload-evidence-input"

export function MemberDocumentSelfServiceForm() {
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [documentType, setDocumentType] = useState("")
  const [documentUrl, setDocumentUrl] = useState("")
  const [reviewNotes, setReviewNotes] = useState("")

  function submitDocument() {
    startTransition(async () => {
      try {
        await createOwnMemberDocumentAction(
          objectToFormData({
            documentType,
            documentUrl,
            reviewNotes,
          })
        )
        setDocumentType("")
        setDocumentUrl("")
        setReviewNotes("")
        showSuccess("Document submitted", "Your document is waiting for review.")
        router.refresh()
      } catch (error) {
        showError(
          "Could not submit document",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <div className="mt-5 border-t border-border pt-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          Document type
          <Input
            disabled={isPending}
            onChange={(event) => setDocumentType(event.target.value)}
            placeholder="National ID"
            value={documentType}
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          Document URL
          <UploadEvidenceInput
            disabled={isPending}
            onUploaded={(upload) => setDocumentUrl(upload.url)}
            purpose="member_document"
            value={documentUrl}
          />
          <Input
            disabled={isPending}
            onChange={(event) => setDocumentUrl(event.target.value)}
            placeholder="https://..."
            value={documentUrl}
          />
        </label>
      </div>
      <label className="mt-3 grid gap-1 text-xs font-medium text-muted-foreground">
        Notes
        <Textarea
          disabled={isPending}
          onChange={(event) => setReviewNotes(event.target.value)}
          placeholder="What should staff review?"
          value={reviewNotes}
        />
      </label>
      <div className="mt-3 flex justify-end">
        <Button
          disabled={isPending || !documentType.trim() || !documentUrl.trim()}
          onClick={submitDocument}
          type="button"
        >
          Submit document
        </Button>
      </div>
    </div>
  )
}
