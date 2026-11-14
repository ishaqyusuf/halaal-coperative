import type { Metadata } from "next"
import { FinanceSettingsRoute } from "../finance-route"

export const metadata: Metadata = {
  title: "Loans | Finance setup",
}

export default function FinanceLoanPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  return <FinanceSettingsRoute searchParams={searchParams} section="loan" />
}
