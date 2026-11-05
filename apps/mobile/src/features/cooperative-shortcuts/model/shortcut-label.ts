// Android recommends ~10 characters for the launcher label and ~25 for the
// long label; launchers may truncate further.
export const SHORTCUT_SHORT_LABEL_MAX = 12
export const SHORTCUT_LONG_LABEL_MAX = 25

const UNSAFE_CHARACTERS = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g

export function sanitizeCooperativeName(name: string) {
  return name.replace(UNSAFE_CHARACTERS, "").replace(/\s+/g, " ").trim()
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value
  const slice = value.slice(0, max - 1)
  const wordBoundary = slice.lastIndexOf(" ")
  const base =
    wordBoundary >= Math.floor(max / 2) ? slice.slice(0, wordBoundary) : slice
  return `${base.trimEnd()}…`
}

/**
 * Launcher metadata is branding only: the sanitized cooperative name, never a
 * member name, balance, account number or notification text.
 */
export function buildShortcutLabels(cooperativeName: string) {
  const name = sanitizeCooperativeName(cooperativeName) || "HalaalVest"
  return {
    longLabel: truncate(name, SHORTCUT_LONG_LABEL_MAX),
    shortLabel: truncate(name, SHORTCUT_SHORT_LABEL_MAX),
  }
}

export function sanitizeShortcutMark(mark: string | null | undefined) {
  const cleaned = (mark ?? "")
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .slice(0, 3)
  return cleaned || "HV"
}
