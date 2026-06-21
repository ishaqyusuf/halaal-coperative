import { FinanceSettingsRoute } from "../finance-route"

export default function FinanceMigrationPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  return (
    <FinanceSettingsRoute searchParams={searchParams} section="migration" />
  )
}
