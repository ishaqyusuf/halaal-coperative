import { ImportsSettingsRoute } from "../imports-route"

export default function MemberImportsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  return <ImportsSettingsRoute searchParams={searchParams} section="members" />
}
