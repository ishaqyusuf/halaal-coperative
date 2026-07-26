import { buildQaEmail, normalizeCooperativeQaSlug } from "@halaalvest/utils"

function uniqueSuffix() {
  return String(Date.now()).slice(-6)
}

export function getGenericQuickFillValue(input: {
  emailDomain: string
  max?: string
  min?: string
  name: string
  type: string
}) {
  const name = input.name.toLowerCase()
  const today = new Date().toISOString().slice(0, 10)

  if (input.type === "email" || name.includes("email")) {
    return buildQaEmail(`qa-user-${uniqueSuffix()}`, input.emailDomain)
  }

  if (input.type === "password" || name.includes("password")) {
    return "password123"
  }

  if (input.type === "date" || name.endsWith("at") || name.includes("date")) {
    return today
  }

  if (input.type === "month") {
    return today.slice(0, 7)
  }

  if (input.type === "url" || name.includes("url")) {
    return "https://example.test/qa-evidence"
  }

  if (input.type === "tel" || name.includes("phone")) {
    return "+2348012345678"
  }

  if (
    input.type === "number" ||
    name.includes("amount") ||
    name.includes("cost") ||
    name.includes("units") ||
    name.includes("months")
  ) {
    const minimum = Number(input.min)
    const maximum = Number(input.max)
    const candidate = Number.isFinite(minimum) && minimum > 0 ? minimum : 1

    return String(
      Number.isFinite(maximum) && maximum >= candidate
        ? Math.min(Math.max(candidate, 10), maximum)
        : Math.max(candidate, 10),
    )
  }

  if (name.includes("fullname") || name === "name") {
    return `QA User ${uniqueSuffix()}`
  }

  if (name.includes("cooperative")) {
    return `QA Cooperative ${uniqueSuffix()}`
  }

  if (name.includes("reference")) {
    return `QA-${uniqueSuffix()}`
  }

  if (name.includes("address")) {
    return "12 Cooperative Road, Kaduna"
  }

  if (name.includes("reason") || name.includes("notes")) {
    return "QA test evidence"
  }

  if (name.includes("subject") || name.includes("title")) {
    return "QA test request"
  }

  return normalizeCooperativeQaSlug(input.name || "qa-value")
}

export function isSearchOnlyForm(form: HTMLFormElement) {
  const editableControls = Array.from(
    form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      "input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=file]), select, textarea",
    ),
  )

  if (editableControls.length === 0) return true

  if (
    editableControls.every(
      (control) =>
        control instanceof HTMLInputElement && control.type === "search",
    )
  ) {
    return true
  }

  const searchNames = new Set([
    "action",
    "assignedtouserid",
    "category",
    "filter",
    "from",
    "memberid",
    "priority",
    "q",
    "query",
    "search",
    "sort",
    "stage",
    "status",
    "to",
  ])

  return editableControls.every((control) =>
    searchNames.has((control.getAttribute("name") ?? "").toLowerCase()),
  )
}
