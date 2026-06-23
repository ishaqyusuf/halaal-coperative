import { ImportsSettingsRoute } from "../imports-route"

export default function LoanProductImportsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  return (
    <ImportsSettingsRoute
      searchParams={searchParams}
      section="loan_products"
    />
  )
}
