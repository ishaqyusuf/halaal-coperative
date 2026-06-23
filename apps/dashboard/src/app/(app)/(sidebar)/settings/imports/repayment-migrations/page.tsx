import { ImportsSettingsRoute } from "../imports-route"

export default function RepaymentMigrationImportsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  return (
    <ImportsSettingsRoute
      searchParams={searchParams}
      section="repayment_migrations"
    />
  )
}
