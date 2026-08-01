import type { Metadata } from "next"
import type { SearchParams } from "nuqs"
import { FinanceSettingsRoute } from "./finance-route"

export const metadata: Metadata = {
  title: "Finance Settings | Halaalvest",
}

export default function FinanceSettingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  return <FinanceSettingsRoute searchParams={searchParams} section="overview" />
}
