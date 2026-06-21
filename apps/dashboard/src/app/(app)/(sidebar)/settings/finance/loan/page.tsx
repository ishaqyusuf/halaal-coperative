import { FinanceSettingsRoute } from "../finance-route"

export default function FinanceLoanPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  return <FinanceSettingsRoute searchParams={searchParams} section="loan" />
}
