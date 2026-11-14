import type {
  FinanceShareVersionRow,
  TenantFinanceSetupLock,
  TenantSharePolicySettings,
} from "@halaalvest/db"
import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import {
  AddShareAmountButton,
  OpenShareModelButton,
  ShareAmountRow,
} from "@/components/finance-settings/finance-settings-buttons"
import {
  FinanceSettingsFrame,
  FinanceSettingsNotice,
  FinanceSettingsSection,
} from "@/components/finance-settings/finance-settings-frame"
import { ShareSheet } from "@/components/sheets/share-sheet"
import {
  getFinanceLockWords,
  getShareAmountWords,
  getShareModelWords,
} from "@/lib/finance/finance-settings-words"
import { formatDayMonthYear } from "@/utils/format"

/** Shares in Finance setup: how members hold shares and its terms. */
export function ShareSettingsView({
  lock,
  sharePolicy,
  shareVersions,
  startDate,
}: {
  lock: TenantFinanceSetupLock
  sharePolicy: TenantSharePolicySettings
  shareVersions: FinanceShareVersionRow[]
  startDate: string | null
}) {
  const words = getShareModelWords(sharePolicy)
  const isUnits = sharePolicy.configurationMode === "unit_based"
  const lockWords = getFinanceLockWords(lock)
  const rows = shareVersions.map((version, index) => ({
    ...version,
    isCurrent: index === shareVersions.length - 1,
  }))

  return (
    <FinanceSettingsFrame intro="How members hold shares in the cooperative.">
      <FinanceSettingsSection
        action={
          isUnits || !lock.isLocked ? <OpenShareModelButton /> : null
        }
        title="Shares"
      >
        <div className="grid gap-1">
          <p className="text-lg font-semibold">{words.title}</p>
          <p className="text-base text-muted-foreground">{words.detail}</p>
        </div>
      </FinanceSettingsSection>

      {isUnits ? (
        <p className="text-base text-muted-foreground">
          Members ask for more shares on the{" "}
          <Link
            className="inline-flex min-h-11 items-center font-medium text-foreground underline underline-offset-4"
            href="/shares"
          >
            Shares page
          </Link>
          , and you approve them there.
        </p>
      ) : (
        <FinanceSettingsSection
          action={lock.isLocked ? null : <AddShareAmountButton />}
          title="Monthly share amount"
        >
          {rows.length ? (
            <ul className="divide-y divide-border border-y border-border">
              {[...rows].reverse().map((row) => (
                <li key={row.id}>
                  <ShareAmountRow id={row.id} isLocked={lock.isLocked}>
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg font-semibold">
                        {getShareAmountWords(row)}
                        {row.valueType === "fixed_amount" ? " a month" : ""}
                      </span>
                      <span className="mt-1 block text-base text-muted-foreground">
                        From {formatDayMonthYear(row.effectiveFrom)}
                        {row.isCurrent ? " · Now" : ""}
                      </span>
                    </span>
                  </ShareAmountRow>
                </li>
              ))}
            </ul>
          ) : (
            <p className="border-y border-border py-8 text-center text-base text-muted-foreground">
              No monthly share amount yet.
            </p>
          )}
        </FinanceSettingsSection>
      )}

      {lockWords && !isUnits ? (
        <FinanceSettingsNotice>{lockWords}</FinanceSettingsNotice>
      ) : null}

      <ShareSheet
        canChangeModel={!lock.isLocked}
        financeStartDate={startDate}
        isLocked={lock.isLocked}
        rows={rows}
        sharePolicy={sharePolicy}
      />
    </FinanceSettingsFrame>
  )
}
