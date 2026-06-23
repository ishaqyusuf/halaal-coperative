import { ImportsSettingsRoute } from "../imports-route"

export default function DeductionSourceImportsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  return (
    <ImportsSettingsRoute
      searchParams={searchParams}
      section="deduction_sources"
    />
  )
}
