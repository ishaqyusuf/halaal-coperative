import { ImportsSettingsRoute } from "../imports-route"

export default function ChargeImportsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  return <ImportsSettingsRoute searchParams={searchParams} section="charges" />
}
