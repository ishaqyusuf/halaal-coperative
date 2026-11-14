"use client"

import { isSafeSupportAttachmentUrl } from "@halaalvest/utils"
import { cn } from "@halaalvest/ui/lib/utils"
import type { SupportCaseRow } from "@halaalvest/db"
import { Paperclip } from "lucide-react"
import {
  formatSupportDateTime,
  type SupportViewer,
} from "@/lib/support/support-words"

type SupportMessage = SupportCaseRow["messages"][number]

function authorName(message: SupportMessage, viewer: SupportViewer) {
  if (message.authorType === "system") return "Halaalvest"
  if (message.authorType === "member") {
    return viewer === "member"
      ? "You"
      : (message.authorUser?.fullName ?? "Member")
  }

  return viewer === "member"
    ? "Cooperative office"
    : (message.authorUser?.fullName ?? "Staff")
}

/** The case's messages, oldest first. Office replies sit on a tinted panel. */
export function SupportConversation({
  messages,
  viewer,
}: {
  messages: SupportMessage[]
  viewer: SupportViewer
}) {
  if (!messages.length) {
    return <p className="text-base text-muted-foreground">No messages yet.</p>
  }

  return (
    <ol aria-label="Messages" className="grid gap-3">
      {messages.map((message) => {
        const fromOffice = message.authorType === "staff"

        return (
          <li
            className={cn(
              "rounded-(--ui-radius-surface) border px-4 py-3",
              fromOffice
                ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30"
                : "border-border bg-background"
            )}
            key={message.id}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="text-base font-semibold text-foreground">
                {authorName(message, viewer)}
              </span>
              <time
                className="text-sm text-muted-foreground"
                dateTime={new Date(message.createdAt).toISOString()}
              >
                {formatSupportDateTime(message.createdAt)}
              </time>
            </div>
            <p className="mt-2 text-base leading-7 [overflow-wrap:anywhere] whitespace-pre-wrap text-foreground">
              {message.message}
            </p>
            {isSafeSupportAttachmentUrl(message.attachmentUrl) ? (
              <a
                className="mt-1 inline-flex min-h-11 items-center gap-2 text-base font-medium text-foreground underline underline-offset-4"
                href={message.attachmentUrl}
                rel="noreferrer"
                target="_blank"
              >
                <Paperclip aria-hidden="true" className="size-4" />
                Open attached file
              </a>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
