import { ImportsSettingsRoute } from "../imports-route"

export default function LoanMigrationImportsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  return (
    <ImportsSettingsRoute
      searchParams={searchParams}
      section="loan_migrations"
    />
  )
}
