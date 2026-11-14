import type { FinanceSettingsOverview } from "@halaalvest/db"
import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { ChevronRight } from "lucide-react"
import {
  FinanceSettingsFrame,
  FinanceSettingsNotice,
  FinanceSettingsSection,
} from "@/components/finance-settings/finance-settings-frame"
import { OpenTenantFinanceSettingsSheet } from "@/components/open-tenant-finance-settings-sheet"
import { TenantFinanceSettingsSheet } from "@/components/sheets/tenant-finance-settings-sheet"
import {
  getFinanceLockWords,
  getLoanProductWords,
  getLoanWindowWords,
  getMonthlyShareWords,
  getProfitFrequencyWords,
  getShareModelWords,
} from "@/lib/finance/finance-settings-words"
import { formatDayMonthYear } from "@/utils/format"

type OverviewRow = {
  href: string
  lines: string[]
  title: string
}

function getOverviewRows(data: FinanceSettingsOverview): OverviewRow[] {
  const shareWords = getShareModelWords(data.sharePolicy)
  const { charges } = data

  return [
    {
      href: "/settings/finance/loan",
      lines: [
        ...data.loanProducts.map(
          (product) =>
            `${product.loanType === "quick" ? "Quick loan" : "Normal loan"}: ${getLoanProductWords(product)}`
        ),
        `Loan requests this month: ${getLoanWindowWords(data.currentCycleStatus)}`,
      ],
      title: "Loans",
    },
    {
      href: "/settings/finance/charges",
      lines: [
        charges.total === 0
          ? "No charges yet"
          : `${charges.total} charge${charges.total === 1 ? "" : "s"}, ${
              charges.on === charges.total ? "all on" : `${charges.on} on`
            }`,
      ],
      title: "Charges",
    },
    {
      href: "/settings/finance/shares",
      lines:
        data.sharePolicy.configurationMode === "unit_based"
          ? [shareWords.title, shareWords.detail]
          : [shareWords.title, getMonthlyShareWords(data.currentMonthlyShare)],
      title: "Shares",
    },
    {
      href: "/settings/finance/business",
      lines: [
        getProfitFrequencyWords(
          data.businessPolicy.profitDistributionFrequency
        ),
        `${data.businessPolicy.defaultDistributablePercentage}% of profit goes to members`,
      ],
      title: "Business profit",
    },
    {
      href: "/settings/finance/migration",
      lines: [
        data.lock.isLive
          ? "Done. Your cooperative is live."
          : "Still being added",
      ],
      title: "Opening balances",
    },
  ]
}

export function FinanceOverviewView({
  data,
  quickFillEnabled,
}: {
  data: FinanceSettingsOverview
  quickFillEnabled: boolean
}) {
  const lockWords = getFinanceLockWords(data.lock)

  return (
    <FinanceSettingsFrame intro="How money works in your cooperative. Tap a part to change it.">
      <ul className="divide-y divide-border border-y border-border">
        {getOverviewRows(data).map((row) => (
          <li key={row.href}>
            <Link
              className="flex min-h-11 items-center gap-3 px-1 py-4 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:gap-4 sm:px-3"
              href={row.href}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-semibold text-foreground">
                  {row.title}
                </span>
                {row.lines.map((line) => (
                  <span
                    className="mt-1 block text-base [overflow-wrap:anywhere] text-muted-foreground"
                    key={line}
                  >
                    {line}
                  </span>
                ))}
              </span>
              <ChevronRight
                aria-hidden="true"
                className="size-5 shrink-0 text-muted-foreground"
              />
            </Link>
          </li>
        ))}
      </ul>

      <FinanceSettingsSection
        action={
          data.lock.isLocked ? null : (
            <OpenTenantFinanceSettingsSheet
              label={data.startDate ? "Change start date" : "Set start date"}
              type="startDate"
            />
          )
        }
        title="Start date"
      >
        <p className="text-lg text-foreground">
          {data.startDate
            ? `Records begin on ${formatDayMonthYear(data.startDate)}.`
            : "Not set yet. Set the date your cooperative's records begin."}
        </p>
      </FinanceSettingsSection>

      {lockWords ? <FinanceSettingsNotice>{lockWords}</FinanceSettingsNotice> : null}

      <TenantFinanceSettingsSheet
        devMode={quickFillEnabled}
        tenantStartDate={data.startDate}
      />
    </FinanceSettingsFrame>
  )
}
