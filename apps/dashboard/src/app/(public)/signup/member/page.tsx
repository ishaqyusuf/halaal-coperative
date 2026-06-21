import { tenantRedirect } from "@/utils/tenant-redirect"

export default async function LegacyMemberSignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const token = typeof params.token === "string" ? params.token : null
  await tenantRedirect(token ? `/signup/members?token=${encodeURIComponent(token)}` : "/signup/members")
}
