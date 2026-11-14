import type { TenantFinanceSetupLock } from "@halaalvest/db"
import { Badge } from "@halaalvest/ui/components/badge"
import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { ChevronRight } from "lucide-react"
import type { ReactNode } from "react"
import {
  AddChargeButton,
  ChargeRowButton,
} from "@/components/finance-settings/finance-settings-buttons"
import {
  FinanceSettingsFrame,
  FinanceSettingsNotice,
  FinanceSettingsSection,
} from "@/components/finance-settings/finance-settings-frame"
import { ChargeSheet } from "@/components/sheets/charge-sheet"
import type { Charge } from "@/components/charge/charge-types"
import {
  formatChargeAmount,
  getChargeFrequencyWord,
} from "@/lib/charges/charge-words"
import { getFinanceLockWords } from "@/lib/finance/finance-settings-words"
import { memberStateToneClassNames } from "@/lib/members/member-status-words"

function ChargeRowBody({ charge }: { charge: Charge }) {
  const amountNow = charge.currentVersion
  const pastAmounts = charge.versions.length

  return (
    <>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-lg font-semibold break-words text-foreground">
            {charge.name}
          </span>
          {charge.isActive ? null : (
            <Badge className={memberStateToneClassNames.muted} variant="outline">
              Off
            </Badge>
          )}
        </span>
        <span className="mt-1 block text-base text-muted-foreground">
          {getChargeFrequencyWord(charge.chargeFrequency)}
          {pastAmounts > 1 ? ` · ${pastAmounts} amounts over time` : ""}
        </span>
      </span>
      <span className="shrink-0 text-right text-lg font-semibold tabular-nums">
        {amountNow
          ? formatChargeAmount(amountNow.amount, amountNow.chargeValueType)
          : "—"}
      </span>
    </>
  )
}

/** Charges in Finance setup: each charge and its amounts over time. */
export function ChargeSettingsView({
  charges,
  lock,
  quickFillEnabled,
  startDate,
}: {
  charges: Charge[]
  lock: TenantFinanceSetupLock
  quickFillEnabled: boolean
  startDate: string | null
}) {
  const lockWords = getFinanceLockWords(lock)
  const row = (charge: Charge): ReactNode =>
    lock.isLive ? (
      <Link
        className="flex min-h-11 items-center gap-3 px-1 py-4 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:gap-4 sm:px-3"
        href={`/charges?chargeOperationSheetType=details&chargeDefinitionId=${charge.id}`}
      >
        <ChargeRowBody charge={charge} />
        <ChevronRight
          aria-hidden="true"
          className="size-5 shrink-0 text-muted-foreground"
        />
      </Link>
    ) : (
      <ChargeRowButton id={charge.id}>
        <ChargeRowBody charge={charge} />
      </ChargeRowButton>
    )

  return (
    <FinanceSettingsFrame intro="The levies and fees your cooperative takes, and their amounts over time.">
      <FinanceSettingsSection
        action={lock.isLocked ? null : <AddChargeButton />}
        title="Charges"
      >
        {lock.isLive ? (
          <p className="text-base text-muted-foreground">
            Add charges, change amounts or turn them off on the{" "}
            <Link
              className="inline-flex min-h-11 items-center font-medium text-foreground underline underline-offset-4"
              href="/charges"
            >
              Charges page
            </Link>
            .
          </p>
        ) : null}
        {charges.length ? (
          <ul className="divide-y divide-border border-y border-border">
            {charges.map((charge) => (
              <li key={charge.id}>{row(charge)}</li>
            ))}
          </ul>
        ) : (
          <p className="border-y border-border py-8 text-center text-base text-muted-foreground">
            No charges yet.
          </p>
        )}
      </FinanceSettingsSection>

      {lockWords && !lock.isLive ? (
        <FinanceSettingsNotice>{lockWords}</FinanceSettingsNotice>
      ) : null}

      {lock.isLive ? null : (
        <ChargeSheet
          financeStartDate={startDate}
          isLocked={lock.isLocked}
          quickFillEnabled={quickFillEnabled}
          rows={charges}
        />
      )}
    </FinanceSettingsFrame>
  )
}
