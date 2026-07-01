import { getMemberSignupLinkAccess, getTenantMemberSignupSettings } from "@halaalvest/db"
import { verifyMemberSignupLinkToken } from "./member-signup-link-token"

type MemberSignupGate =
  | {
      access: "denied"
      link: null
      message: string
      token: null
      type: "disabled" | "hidden" | "in_office_only" | "invalid_token"
    }
  | {
      access: "granted"
      link: {
        currentSignupCount: number
        expiresAt: Date | null
        id: string
        isEnabled: boolean
        maxSignups: number | null
        name: string
        notes: string | null
        tenantId: string
        tokenVersion: number
      } | null
      mode: "link" | "public"
      token: string | null
    }

export async function resolveMemberSignupGate(input: {
  tenantId: string
  token?: string | null
}): Promise<MemberSignupGate> {
  const settings = await getTenantMemberSignupSettings(input.tenantId)
  const providedToken = input.token?.trim() || null

  if (settings.memberSignupAccessMode === "disabled") {
    return {
      access: "denied",
      link: null,
      message:
        "This cooperative has disabled member self-service signup. Contact the cooperative office for onboarding.",
      token: null,
      type: "disabled",
    }
  }

  if (providedToken) {
    try {
      const payload = verifyMemberSignupLinkToken(providedToken)

      if (payload.tenantId !== input.tenantId) {
        throw new Error("This signup link belongs to a different cooperative.")
      }

      const link = await getMemberSignupLinkAccess({
        linkId: payload.linkId,
        tenantId: input.tenantId,
        tokenVersion: payload.tokenVersion,
      })

      if (!link) {
        throw new Error("This signup link is no longer available.")
      }

      if (!link.isEnabled) {
        throw new Error("This signup link is currently disabled.")
      }

      if (link.expiresAt && link.expiresAt.getTime() <= Date.now()) {
        throw new Error("This signup link has expired.")
      }

      if (link.maxSignups !== null && link.currentSignupCount >= link.maxSignups) {
        throw new Error("This signup link has reached its signup limit.")
      }

      return {
        access: "granted",
        link,
        mode: "link",
        token: providedToken,
      }
    } catch (error) {
      return {
        access: "denied",
        link: null,
        message: error instanceof Error ? error.message : "The signup link could not be used.",
        token: null,
        type: "invalid_token",
      }
    }
  }

  if (settings.memberSignupAccessMode === "public") {
    return {
      access: "granted",
      link: null,
      mode: "public",
      token: null,
    }
  }

  if (settings.memberSignupAccessMode === "hidden") {
    return {
      access: "denied",
      link: null,
      message:
        "Member signup is hidden on this cooperative host. Ask the cooperative office for a staff-issued signup link.",
      token: null,
      type: "hidden",
    }
  }

  return {
    access: "denied",
    link: null,
    message:
      "This cooperative only allows member signup in-office or through a staff-issued signup link.",
    token: null,
    type: "in_office_only",
  }
}
