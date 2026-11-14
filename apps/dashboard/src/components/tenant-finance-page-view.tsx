import type { ReactNode } from "react"
import { FinanceSettingsFrame } from "@/components/finance-settings/finance-settings-frame"

/** The opening-balances workspace inside the Finance setup frame. */
export function TenantFinancePageView({ children }: { children: ReactNode }) {
  return (
    <FinanceSettingsFrame className="max-w-[980px]">{children}</FinanceSettingsFrame>
  )
}
