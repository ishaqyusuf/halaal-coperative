import type { MobileProfile } from "@/lib/session-store"

export type GateIdentity =
  | { kind: "brand" }
  | { kind: "cooperative"; mark: string; name: string; detail?: string }

/** The signed-in cooperative's mark and the user line, or HalaalVest. */
export function gateIdentityFor(
  profile: MobileProfile | null | undefined
): GateIdentity {
  if (!profile) return { kind: "brand" }
  const mark =
    profile.tenant.branding.mark?.trim() ||
    profile.tenant.name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("")
  return {
    detail: [profile.user.name, profile.member?.code].filter(Boolean).join(" · "),
    kind: "cooperative",
    mark,
    name: profile.tenant.name,
  }
}
