"use client"

import { ChevronRight } from "lucide-react"
import { SupportStatusBadge } from "@/components/support/support-status-badge"
import { useSupportCaseParams } from "@/hooks/use-support-case-params"
import {
  formatSupportDate,
  type SupportViewer,
} from "@/lib/support/support-words"
import {
  isUrgentSupportCase,
  latestMessageAuthor,
  type SupportCase,
} from "./columns"

/** One case on a phone: tap anywhere to open it. */
export function SupportMobileItem({
  mode,
  supportCase,
}: {
  mode: SupportViewer
  supportCase: SupportCase
}) {
  const { setParams } = useSupportCaseParams()
  const message = supportCase.latestMessage
  const author = latestMessageAuthor(supportCase, mode)

  return (
    <button
      className="flex min-h-[72px] w-full items-center gap-3 py-4 text-left focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
      onClick={() =>
        void setParams({
          supportCaseId: supportCase.id,
          supportCaseSheetType: "case",
        })
      }
      type="button"
    >
      <span className="grid min-w-0 flex-1 gap-1">
        <span className="line-clamp-2 text-base font-semibold [overflow-wrap:anywhere] text-foreground">
          {supportCase.subject}
        </span>
        {mode === "staff" ? (
          <span className="truncate text-base text-muted-foreground">
            {supportCase.member?.fullName ?? "No member"}
          </span>
        ) : null}
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
          <SupportStatusBadge
            lastAuthor={message?.authorType}
            status={supportCase.status}
            viewer={mode}
          />
          {isUrgentSupportCase(supportCase) && mode === "staff" ? (
            <span className="text-base font-semibold text-red-700 dark:text-red-400">
              Urgent
            </span>
          ) : null}
        </span>
        {message ? (
          <span className="line-clamp-2 text-base [overflow-wrap:anywhere] text-muted-foreground">
            {author ? `${author}: ` : ""}
            {message.message}
          </span>
        ) : null}
        <span className="text-sm text-muted-foreground">
          {formatSupportDate(message?.createdAt ?? supportCase.createdAt)}
        </span>
      </span>
      <ChevronRight
        aria-hidden="true"
        className="size-5 shrink-0 text-muted-foreground"
      />
    </button>
  )
}
