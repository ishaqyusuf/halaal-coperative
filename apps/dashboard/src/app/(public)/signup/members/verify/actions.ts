"use server"

import { redirect } from "next/navigation"
import { verifyMemberOnboardingRequest } from "@halaalvest/db"
import { verifyMemberOnboardingVerificationToken } from "@/lib/member-onboarding-token"
import { getDashboardServerContext } from "@/lib/server-context"
import { getRequestMigrationGateState } from "@/lib/setup-gate"

/**
 * The member presses "Confirm my email" (a POST), so a mail scanner that only
 * opens the link (GET) can't confirm the request for them. The signed token
 * names one request; confirming twice is a no-op.
 */
export async function confirmMemberSignupEmailAction(formData: FormData) {
  const token = formData.get("token")
  const { tenant } = await getDashboardServerContext()
  let status: "closed" | "failed" | "verified" = "failed"

  if (tenant && typeof token === "string" && token) {
    if (
      !(await getRequestMigrationGateState(tenant.id)).writeAccess
        .canUseLiveFinancialWrites
    ) {
      status = "closed"
    } else {
      try {
        const payload = verifyMemberOnboardingVerificationToken(token)

        if (payload.tenantId === tenant.id) {
          await verifyMemberOnboardingRequest({
            requestId: payload.requestId,
            tenantId: payload.tenantId,
          })
          status = "verified"
        }
      } catch {
        status = "failed"
      }
    }
  }

  redirect(`/signup/members/verify?status=${status}`)
}
