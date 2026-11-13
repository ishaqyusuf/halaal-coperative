"use client"

import { useEffect, useState } from "react"
import {
  findOpeningPositionDateIssues,
  type OpeningPositionDateIssue,
} from "@halaalvest/domain"

const dateFields = [
  "activeFinancingOpenedAt",
  "foodPurchaseOpenedAt",
  "openingDate",
  "procurementOpenedAt",
] as const

/**
 * Stops the opening-position form from staging dates that fall before the
 * member joined, and says which dates to fix. The server repeats the check.
 */
export function OpeningPositionDateGuard({
  formId,
  joinedAt,
}: {
  formId: string
  joinedAt: string | null
}) {
  const [issues, setIssues] = useState<OpeningPositionDateIssue[]>([])

  useEffect(() => {
    const form = document.getElementById(formId)

    if (!(form instanceof HTMLFormElement)) {
      return
    }

    function readIssues(target: HTMLFormElement) {
      const formData = new FormData(target)

      return findOpeningPositionDateIssues({
        dates: Object.fromEntries(
          dateFields.map((field) => [field, String(formData.get(field) ?? "")])
        ),
        joinedAt,
      })
    }

    function onSubmit(event: SubmitEvent) {
      const nextIssues = readIssues(event.currentTarget as HTMLFormElement)

      setIssues(nextIssues)

      if (nextIssues.length) {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
    }

    function onChange(event: Event) {
      setIssues((current) =>
        current.length ? readIssues(event.currentTarget as HTMLFormElement) : current
      )
    }

    // Date pickers write hidden inputs without input or change events, so
    // also watch their value attribute to clear a fixed warning.
    const valueObserver = new MutationObserver(() =>
      setIssues((current) => (current.length ? readIssues(form) : current))
    )

    // Capture runs before React's own submit handling of the form action.
    form.addEventListener("submit", onSubmit, { capture: true })
    form.addEventListener("change", onChange)
    form.addEventListener("input", onChange)
    valueObserver.observe(form, {
      attributeFilter: ["value"],
      attributes: true,
      subtree: true,
    })

    return () => {
      form.removeEventListener("submit", onSubmit, { capture: true })
      form.removeEventListener("change", onChange)
      form.removeEventListener("input", onChange)
      valueObserver.disconnect()
    }
  }, [formId, joinedAt])

  if (!issues.length) {
    return null
  }

  return (
    <div
      className="border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm leading-6 text-destructive"
      role="alert"
    >
      <p className="font-medium">Check these dates before staging:</p>
      <ul className="mt-1 list-disc pl-5">
        {issues.map((issue) => (
          <li key={issue.field}>{issue.message}</li>
        ))}
      </ul>
    </div>
  )
}
