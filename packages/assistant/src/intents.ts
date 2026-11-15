import type { CapabilityId } from "./capabilities/types"

/**
 * Deterministic intent routing. It is the fast path for common wording, the
 * whole router in rehearsal mode (no model key configured), and a guard on
 * the model path. It only names a capability and candidate fields: typed
 * server functions still own record selection, dates, money and authority.
 */

export type AssistantIntent =
  | { capabilityId: CapabilityId; candidates: IntentCandidates }
  | { capabilityId: null; candidates: IntentCandidates }

export type IntentCandidates = {
  /** Naira amount as decimal string, e.g. "25000" or "25000.50". */
  amount: string | null
  /** Member number such as HV-1048 (any PREFIX-digits form). */
  memberNumber: string | null
  /** Free text after "find"/"search"/"open"/"history". */
  memberQuery: string | null
  /** YYYY-MM when a month is named. */
  period: string | null
  /** YYYY-MM-DD payment date ("yesterday", "on 12 November"); never in the future. */
  paidOn?: string | null
}

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const

const UNITS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90,
}
const SCALES: Record<string, number> = { hundred: 100, thousand: 1_000, million: 1_000_000 }

/**
 * "five thousand naira", "twenty-five thousand", "2.5 million naira". A word
 * amount needs a scale word or the word naira, so "one of my receipts" isn't
 * read as ₦1.
 */
function extractWordAmount(text: string): string | null {
  const words = text.toLowerCase().replace(/-/g, " ").replace(/,/g, "").split(/\s+/)
  for (let start = 0; start < words.length; start += 1) {
    let total = 0
    let current = 0
    let used = 0
    let scaled = false
    for (let index = start; index < words.length; index += 1) {
      const word = words[index]!.replace(/[^a-z0-9.]/g, "")
      if (word === "and" && used) continue
      if (/^\d+(\.\d+)?$/.test(word) && !used) current = Number(word)
      else if (word in UNITS) current += UNITS[word]!
      else if (word in SCALES) {
        if (!used) break
        const scale = SCALES[word]!
        if (scale === 100) current = (current || 1) * 100
        else {
          total += (current || 1) * scale
          current = 0
        }
        scaled = true
      } else break
      used += 1
    }
    if (!used) continue
    const value = total + current
    const next = words[start + used]?.replace(/[^a-z]/g, "")
    if (value > 0 && (scaled || next === "naira")) return Number.isInteger(value) ? String(value) : value.toFixed(2)
  }
  return null
}

const LAGOS_OFFSET_MS = 60 * 60 * 1000
const isoDay = (date: Date) => new Date(date.getTime() + LAGOS_OFFSET_MS).toISOString().slice(0, 10)

/** Payment date in Africa/Lagos (UTC+1, no DST). Future dates fall back a year or are dropped. */
export function extractPaidOn(text: string, now: Date = new Date()): string | null {
  const lower = text.toLowerCase()
  const today = isoDay(now)
  const daysAgo = (days: number) => isoDay(new Date(now.getTime() - days * 86_400_000))
  if (/\bday before yesterday\b/.test(lower)) return daysAgo(2)
  if (/\byesterday\b/.test(lower)) return daysAgo(1)
  if (/\btoday\b|\bthis morning\b|\bjust now\b/.test(lower)) return today
  const iso = lower.match(/\b(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/)
  if (iso) return iso[0] <= today ? iso[0] : null
  const monthNames = MONTHS.map((month) => month.slice(0, 3)).join("|")
  const named =
    lower.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${monthNames})[a-z]*\\b`)) ??
    lower.match(new RegExp(`\\b(${monthNames})[a-z]*\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`))
  if (!named) return null
  const [day, monthText] = /\d/.test(named[1]!) ? [Number(named[1]), named[2]!] : [Number(named[2]), named[1]!]
  const month = MONTHS.findIndex((name) => name.startsWith(monthText))
  if (month < 0 || day < 1 || day > 31) return null
  let year = Number(today.slice(0, 4))
  const build = () => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  if (build() > today) year -= 1
  const candidate = build()
  const check = new Date(`${candidate}T00:00:00Z`)
  return check.getUTCDate() === day ? candidate : null
}

export function extractAmount(text: string): string | null {
  const numeric = extractNumericAmount(text)
  return numeric ?? extractWordAmount(text)
}

function extractNumericAmount(text: string): string | null {
  const match = text
    .replace(/,/g, "")
    .match(/(?:₦|ngn|naira|n)\s*(\d+(?:\.\d{1,2})?)\s*(k|m)?|(\d+(?:\.\d{1,2})?)\s*(k|m)?\s*(?:naira|ngn)/i)
  if (!match) return null
  const raw = match[1] ?? match[3]
  const suffix = (match[2] ?? match[4])?.toLowerCase()
  if (!raw) return null
  const value = Number(raw) * (suffix === "k" ? 1_000 : suffix === "m" ? 1_000_000 : 1)
  if (!Number.isFinite(value) || value <= 0) return null
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

export function extractMemberNumber(text: string): string | null {
  // HV-1048, OPA-7641, OPA-QA-075233: letter prefix segments, then digits.
  return (
    text.match(/\b([A-Z]{2,5}(?:-[A-Z]{1,5})*-\d{2,8})\b/i)?.[1]?.toUpperCase() ??
    null
  )
}

export function extractPeriod(text: string, now: Date = new Date()): string | null {
  const lower = text.toLowerCase()
  const iso = lower.match(/\b(20\d{2})-(0[1-9]|1[0-2])\b/)
  if (iso) return `${iso[1]}-${iso[2]}`
  const index = MONTHS.findIndex((month) =>
    new RegExp(`\\b${month}|\\b${month.slice(0, 3)}\\b`).test(lower)
  )
  if (index < 0) return null
  const year =
    lower.match(/\b(20\d{2})\b/)?.[1] ?? String(now.getUTCFullYear())
  return `${year}-${String(index + 1).padStart(2, "0")}`
}

function extractMemberQuery(text: string): string | null {
  const match =
    text.match(
      /\b(?:find|search(?: for)?|look up|lookup|open|show)\s+(?:member\s+)?(.+?)(?:'s\b|\s+history\b|\s+for\b|[?.!]|$)/i
    ) ??
    // "Record ₦25,000 from Aisha Bello for November" / "… for member Aisha"
    text.match(/\b(?:from|for)\s+member\s+(.+?)(?:\s+for\b|\s+in\b|[?.!,]|$)/i) ??
    text.match(/\bfrom\s+(?!member\b)([a-z][a-z'.-]*(?:\s+[a-z][a-z'.-]*){0,3}?)(?:\s+for\b|\s+in\b|[?.!,]|$)/i)
  const query = match?.[1]?.trim()
  if (!query || /^(my|me|receipts?|the|all)\b/i.test(query)) return null
  return query.slice(0, 80)
}

const has = (text: string, pattern: RegExp) => pattern.test(text)

export function routeIntent(
  rawText: string,
  role: "member" | "staff",
  now: Date = new Date()
): AssistantIntent {
  const text = rawText.toLowerCase()
  const candidates: IntentCandidates = {
    amount: extractAmount(rawText),
    memberNumber: extractMemberNumber(rawText),
    memberQuery: extractMemberQuery(rawText),
    period: extractPeriod(rawText, now),
    paidOn: extractPaidOn(rawText, now),
  }
  const route = (capabilityId: CapabilityId | null): AssistantIntent => ({
    capabilityId,
    candidates,
  })

  if (has(text, /^\s*(\/?help|what can you (do|help))/)) return route("X01")
  if (has(text, /(talk to|speak to|human|a person|someone|agent)\b/))
    return route("X02")

  if (role === "staff") {
    if (has(text, /\brecord\b|\bpost\b.*payment|\breceive\b.*payment/))
      return route("S04")
    if (has(text, /receipts?.*(review|pending|approve|queue)|(pending|review).*receipts?/))
      return route("S03")
    if (has(text, /\bhistory\b|\bstatement\b/) && (candidates.memberNumber || candidates.memberQuery))
      return route("S02")
    if (candidates.memberNumber || has(text, /\b(find|search|look ?up|open)\b/))
      return route("S01")
    return route(null)
  }

  if (has(text, /request (a )?payment|refund|withdraw|pay ?out|owe me|money owed/))
    return route("M05")
  if (has(text, /(here'?s|attached|upload|submit|send).*(receipt|proof)|i (paid|transferred)|proof (of|i) pa/))
    return route("M04")
  if (has(text, /receipt/)) return route("M03")
  if (has(text, /loan|financ|repay|instal|next (payment|due)|owe\b/))
    return route("M01")
  if (has(text, /invest|saving|share|profit|dividend|balance|how much (do )?i have/))
    return route("M02")
  return route(null)
}

/** The money-request split from plan §1: never route before a choice. */
export const paymentRequestOptions = [
  { value: "financing", label: "Apply for financing" },
  { value: "special_savings_refund", label: "Withdraw or refund special savings" },
  { value: "money_owed", label: "Help with money the cooperative owes me" },
  { value: "pay_in", label: "Pay money to the cooperative" },
] as const
