import { tenantRedirect } from "@/utils/tenant-redirect"

export default async function LegacyMemberSignupVerificationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const token = typeof params.token === "string" ? params.token : null
  await tenantRedirect(token ? `/signup/members/verify?token=${encodeURIComponent(token)}` : "/signup/members/verify")
}
