import { findUserByEmailAsync, updateUserPasswordHash } from "@halaalvest/db"
import { NextResponse, type NextRequest } from "next/server"
import { buildDashboardRedirectUrl } from "@/lib/auth-redirect"
import { hashPassword } from "@/lib/password"
import {
  getPasswordSetupCopy,
  parsePasswordSetupPurpose,
  type PasswordSetupPurpose,
} from "@/lib/password-setup-copy"
import {
  isPasswordResetTokenCurrent,
  verifyPasswordResetToken,
} from "@/lib/password-reset-token"

function redirectToConfirmError(
  request: NextRequest,
  purpose: PasswordSetupPurpose,
  error: string,
  token?: string
) {
  const query = new URLSearchParams({ error })

  if (token) {
    query.set("token", token)
  }

  if (purpose === "invite") {
    query.set("purpose", purpose)
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
  const purpose = parsePasswordSetupPurpose(formData.get("purpose"))

  if (!token) {
    return redirectToConfirmError(request, purpose, "missing-token")
  }

  if (password !== confirmPassword) {
    return redirectToConfirmError(request, purpose, "password-mismatch", token)
  }

  if (password.trim().length < 8) {
    return redirectToConfirmError(request, purpose, "password-too-short", token)
  }

  try {
    const payload = verifyPasswordResetToken(token)
    const user = await findUserByEmailAsync({
      email: payload.email,
      tenantId: payload.tenantId,
    })

    if (!user || !isPasswordResetTokenCurrent(payload, user)) {
      return redirectToConfirmError(request, purpose, "invalid-token")
    }

    const updated = await updateUserPasswordHash({
      passwordHash: hashPassword(password),
      tenantId: payload.tenantId,
      userId: payload.userId,
    })

    if (!updated) {
      return redirectToConfirmError(request, purpose, "invalid-token")
    }

    return NextResponse.redirect(
      buildDashboardRedirectUrl(
        request,
        `/login?reset=${getPasswordSetupCopy(purpose).loginNotice}`
      ),
      303
    )
  } catch {
    return redirectToConfirmError(request, purpose, "invalid-token")
  }
}
