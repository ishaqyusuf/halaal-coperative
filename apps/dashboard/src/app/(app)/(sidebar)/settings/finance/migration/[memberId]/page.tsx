import { FinanceSettingsRoute } from "../../finance-route"

export default async function FinanceMigrationMemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ memberId: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { memberId } = await params

  return (
    <FinanceSettingsRoute
      migrationMemberId={memberId}
      searchParams={searchParams}
      section="migration-member"
    />
  )
}
