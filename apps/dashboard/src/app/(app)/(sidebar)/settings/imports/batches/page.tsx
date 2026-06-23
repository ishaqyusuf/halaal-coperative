import { ImportsSettingsRoute } from "../imports-route"

export default function ImportBatchesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  return <ImportsSettingsRoute searchParams={searchParams} section="batches" />
}
