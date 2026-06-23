import { ImportsSettingsRoute } from "./imports-route"

export default function ImportsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  return <ImportsSettingsRoute searchParams={searchParams} section="overview" />
}
