import { findUserByEmailAsync, updateUserPasswordHash } from "@halaalvest/db"
import { NextResponse, type NextRequest } from "next/server"
import { buildDashboardRedirectUrl } from "@/lib/auth-redirect"
import { hashPassword } from "@/lib/password"
import {
  isPasswordResetTokenCurrent,
  verifyPasswordResetToken,
} from "@/lib/password-reset-token"

function redirectToConfirmError(
  request: NextRequest,
  error: string,
  token?: string
) {
  const query = new URLSearchParams({ error })

  if (token) {
    query.set("token", token)
  }

  return NextResponse.redirect(
    buildDashboardRedirectUrl(
      request,
      `/login/reset/confirm?${query.toString()}`
    ),
    303
  )
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const token = String(formData.get("token") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const confirmPassword = String(formData.get("confirmPassword") ?? "")

  if (!token) {
    return redirectToConfirmError(request, "missing-token")
  }

  if (password !== confirmPassword) {
    return redirectToConfirmError(request, "password-mismatch", token)
  }

  if (password.trim().length < 8) {
    return redirectToConfirmError(request, "password-too-short", token)
  }

  try {
    const payload = verifyPasswordResetToken(token)
    const user = await findUserByEmailAsync({
      email: payload.email,
      tenantId: payload.tenantId,
    })

    if (!user || !isPasswordResetTokenCurrent(payload, user)) {
      return redirectToConfirmError(request, "invalid-token")
    }

    const updated = await updateUserPasswordHash({
      passwordHash: hashPassword(password),
      tenantId: payload.tenantId,
      userId: payload.userId,
    })

    if (!updated) {
      return redirectToConfirmError(request, "invalid-token")
    }

    return NextResponse.redirect(
      buildDashboardRedirectUrl(request, "/login?reset=complete"),
      303
    )
  } catch {
    return redirectToConfirmError(request, "invalid-token")
  }
}
