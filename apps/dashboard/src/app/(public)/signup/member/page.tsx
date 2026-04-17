import { redirect } from "next/navigation"

export default async function LegacyMemberSignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const token = typeof params.token === "string" ? params.token : null
  redirect(token ? `/signup/members?token=${encodeURIComponent(token)}` : "/signup/members")
}
