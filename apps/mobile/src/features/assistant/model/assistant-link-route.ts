/**
 * Answer and result links are app-relative dashboard paths (`link.href`).
 * Native opens the matching screen only when one exists for the signed role;
 * anything else stays a website link, never a guessed screen. The opened
 * screen re-reads and re-authorizes its own data.
 */
export type AssistantNativeRoute =
  | { kind: "native"; href: string }
  | { kind: "web"; path: string }

const memberRoutes: [RegExp, string][] = [
  [/^\/loans(?:[/?#]|$)/, "/(member)/(tabs)/financing"],
  [/^\/contributions(?:[/?#]|$)/, "/(member)/(tabs)/commitments"],
  [/^\/payment-receipts(?:[/?#]|$)/, "/(member)/receipts"],
  [/^\/support(?:[/?#]|$)/, "/(member)/support"],
  [/^\/shares(?:[/?#]|$)/, "/(member)/(tabs)/shares"],
  [/^\/notifications(?:[/?#]|$)/, "/notifications"],
]

const staffRoutes: [RegExp, string][] = [
  [/^\/contributions(?:[/?#]|$)/, "/(admin)/contributions"],
  [/^\/payment-receipts(?:[/?#]|$)/, "/(admin)/(tabs)/finance"],
  [/^\/loans(?:[/?#]|$)/, "/(admin)/financing-operations"],
  [/^\/notifications(?:[/?#]|$)/, "/notifications"],
]

const MEMBER_ID = /^[A-Za-z0-9_-]{1,64}$/

export function assistantNativeRoute(
  href: string,
  role: "member" | "staff"
): AssistantNativeRoute | null {
  if (!href.startsWith("/") || href.startsWith("//")) return null
  if (role === "staff") {
    const member = href.match(/^\/members\/([^/?#]+)\/?(?:[?#].*)?$/)
    if (member) {
      const id = decodeURIComponentSafe(member[1] ?? "")
      return id && MEMBER_ID.test(id)
        ? { kind: "native", href: `/(admin)/members/${id}` }
        : { kind: "web", path: href }
    }
    if (/^\/members\/?(?:[?#].*)?$/.test(href))
      return { kind: "native", href: "/(admin)/(tabs)/members" }
  }
  const table = role === "member" ? memberRoutes : staffRoutes
  const match = table.find(([pattern]) => pattern.test(href))
  return match ? { kind: "native", href: match[1] } : { kind: "web", path: href }
}

function decodeURIComponentSafe(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return ""
  }
}
