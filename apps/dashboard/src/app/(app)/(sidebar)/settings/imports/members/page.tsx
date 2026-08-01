import type { Metadata } from "next"
import { ImportsSettingsRoute } from "../imports-route"

export const metadata: Metadata = {
  title: "Import members | Halaalvest",
}

export default function MemberImportsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  return <ImportsSettingsRoute searchParams={searchParams} section="members" />
}
