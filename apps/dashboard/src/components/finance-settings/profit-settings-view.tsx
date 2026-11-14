import type { TenantBusinessProfitPolicySettings } from "@halaalvest/db"
import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import {
  FinanceSettingsFrame,
  FinanceSettingsSection,
} from "@/components/finance-settings/finance-settings-frame"
import { OpenTenantFinanceSettingsSheet } from "@/components/open-tenant-finance-settings-sheet"
import { RequestFacts } from "@/components/requests/request-facts"
import { TenantFinanceSettingsSheet } from "@/components/sheets/tenant-finance-settings-sheet"
import {
  getMonthName,
  getProfitFrequencyWords,
  getProfitSeasonPattern,
} from "@/lib/finance/finance-settings-words"

/** Business profit in Finance setup: how profit is shared with members. */
export function ProfitSettingsView({
  businessPolicy,
  canChangePastProfit,
  quickFillEnabled,
}: {
  businessPolicy: TenantBusinessProfitPolicySettings
  canChangePastProfit: boolean
  quickFillEnabled: boolean
}) {
  return (
    <FinanceSettingsFrame intro="How profit from the cooperative's businesses is shared with members.">
      <FinanceSettingsSection
        action={
          <OpenTenantFinanceSettingsSheet
            label="Change"
            type="businessProfitPolicy"
          />
        }
        title="Profit sharing"
      >
        <RequestFacts
          items={[
            {
              label: "How often",
              value: getProfitFrequencyWords(
                businessPolicy.profitDistributionFrequency
              ),
            },
            {
              label: "Seasons",
              value: getProfitSeasonPattern(
                businessPolicy.profitDistributionFrequency,
                businessPolicy.financialYearStartMonth
              ),
            },
            {
              label: "Goes to members",
              value: `${businessPolicy.defaultDistributablePercentage}%, by the share capital each one holds`,
            },
            {
              label: "Kept in reserve",
              value: `${businessPolicy.reserveRetentionPercentage}%`,
            },
            {
              label: "Financial year starts",
              value: getMonthName(businessPolicy.financialYearStartMonth),
            },
            {
              label: "Board approves first",
              value: businessPolicy.requiresProfitDistributionApproval
                ? "Yes"
                : "No",
            },
          ]}
        />
      </FinanceSettingsSection>

      <p className="text-base text-muted-foreground">
        Record profit and share it with members on the{" "}
        <Link
          className="inline-flex min-h-11 items-center font-medium text-foreground underline underline-offset-4"
          href="/business"
        >
          Business page
        </Link>
        .
      </p>

      <TenantFinanceSettingsSheet
        businessPolicy={businessPolicy}
        canChangePastProfit={canChangePastProfit}
        devMode={quickFillEnabled}
        tenantStartDate={null}
      />
    </FinanceSettingsFrame>
  )
}
