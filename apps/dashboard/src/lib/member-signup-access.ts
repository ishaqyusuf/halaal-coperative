import {
  getMemberSignupLinkAccess,
  getTenantMemberSignupSettings,
} from "@halaalvest/db"
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
        "Joining online is closed. Please visit or call the cooperative office.",
      token: null,
      type: "disabled",
    }
  }

  if (providedToken) {
    try {
      const payload = verifyMemberSignupLinkToken(providedToken)

      if (payload.tenantId !== input.tenantId) {
        throw new Error("This link is for a different cooperative.")
      }

      const link = await getMemberSignupLinkAccess({
        linkId: payload.linkId,
        tenantId: input.tenantId,
        tokenVersion: payload.tokenVersion,
      })

      if (!link) {
        throw new Error(
          "This link has been replaced or removed. Ask the office for a new one."
        )
      }

      if (!link.isEnabled) {
        throw new Error(
          "This link is turned off. Ask the office for a new one."
        )
      }

      if (link.expiresAt && link.expiresAt.getTime() <= Date.now()) {
        throw new Error("This link has expired. Ask the office for a new one.")
      }

      if (
        link.maxSignups !== null &&
        link.currentSignupCount >= link.maxSignups
      ) {
        throw new Error("This link is full. Ask the office for a new one.")
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
        message:
          error instanceof Error
            ? error.message
            : "This link does not work. Ask the office for a new one.",
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
      message: "Ask the cooperative office for a joining link.",
      token: null,
      type: "hidden",
    }
  }

  return {
    access: "denied",
    link: null,
    message: "Ask the cooperative office for a joining link.",
    token: null,
    type: "in_office_only",
  }
}
