import type { Metadata } from "next"
import { FinanceSettingsRoute } from "../finance-route"

export const metadata: Metadata = {
  title: "Opening balances | Finance setup",
}

export default function FinanceMigrationPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  return (
    <FinanceSettingsRoute searchParams={searchParams} section="migration" />
  )
}
