/**
 * Versioned opaque launcher identity. The id and URI carry no token,
 * cooperative number, member code or name: they only key a local association
 * that the current signed session must still own.
 */
export const SHORTCUT_ID_PATTERN = /^cs1-[0-9a-f]{32}$/
export const SHORTCUT_PATH_SEGMENT = "cooperative-shortcut"

const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]{0,31}$/

export function createShortcutId(randomBytes: (count: number) => Uint8Array) {
  const bytes = randomBytes(16)
  if (bytes.length !== 16)
    throw new Error("Shortcut id entropy is unavailable.")
  return `cs1-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`
}

export function parseShortcutId(value: unknown) {
  if (typeof value !== "string") return null
  return SHORTCUT_ID_PATTERN.test(value) ? value : null
}

export function buildShortcutUri(scheme: string, shortcutId: string) {
  if (!SCHEME_PATTERN.test(scheme)) throw new Error("Invalid app scheme.")
  if (!parseShortcutId(shortcutId)) throw new Error("Invalid shortcut id.")
  return `${scheme}://${SHORTCUT_PATH_SEGMENT}/${shortcutId}`
}

export function shortcutRoutePath(shortcutId: string) {
  return `/${SHORTCUT_PATH_SEGMENT}/${shortcutId}`
}
