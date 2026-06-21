import { FinanceSettingsRoute } from "./finance-route"

export default function FinanceSetupPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  return <FinanceSettingsRoute searchParams={searchParams} section="overview" />
}
