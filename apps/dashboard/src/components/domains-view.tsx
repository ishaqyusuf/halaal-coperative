import type { TenantDomainRecord } from "@halaalvest/db"
import { AddDomainDialog } from "@/components/domains/add-domain-dialog"
import {
  CheckDomainButton,
  OpenAddDomainButton,
  RemoveDomainButton,
} from "@/components/domains/domain-actions"
import {
  SettingsEmpty,
  SettingsPage,
  SettingsSection,
} from "@/components/workspace-settings/settings-page"
import { getDomainStatus, isPlatformDomain } from "@/lib/domains/domain-words"

function DomainRow({
  actions,
  domain,
}: {
  actions?: React.ReactNode
  domain: TenantDomainRecord
}) {
  const status = getDomainStatus(domain)

  return (
    <li
      className="flex flex-col gap-3 px-1 py-4 sm:flex-row sm:items-center sm:px-3"
      data-domain={domain.hostname}
    >
      <div className="min-w-0 flex-1">
        <p className="text-lg font-semibold [overflow-wrap:anywhere] text-foreground">
          {domain.hostname}
        </p>
        <p className="text-base text-foreground">{status.word}</p>
        <p className="text-base [overflow-wrap:anywhere] text-muted-foreground">
          {status.detail}
        </p>
      </div>
      {actions ? (
        <div className="flex flex-wrap gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
          {actions}
        </div>
      ) : null}
    </li>
  )
}

export function DomainsView({
  devMode,
  domains,
}: {
  devMode: boolean
  domains: TenantDomainRecord[]
}) {
  const halaalvest = domains.filter((domain) => isPlatformDomain(domain))
  const own = domains.filter((domain) => !isPlatformDomain(domain))

  return (
    <SettingsPage
      action={<OpenAddDomainButton />}
      intro="The web address members use to reach your cooperative."
    >
      <SettingsSection title="Halaalvest address">
        {halaalvest.length > 0 ? (
          <ul className="divide-y divide-border border-y border-border">
            {halaalvest.map((domain) => (
              <DomainRow domain={domain} key={domain.id} />
            ))}
          </ul>
        ) : (
          <SettingsEmpty
            body="Contact support to set up your web address."
            title="No web address yet"
          />
        )}
      </SettingsSection>

      {own.length > 0 ? (
        <SettingsSection title="Your own addresses">
          <ul className="divide-y divide-border border-y border-border">
            {own.map((domain) => (
              <DomainRow
                actions={
                  <>
                    <CheckDomainButton
                      domainId={domain.id}
                      hostname={domain.hostname}
                    />
                    <RemoveDomainButton
                      domainId={domain.id}
                      hostname={domain.hostname}
                    />
                  </>
                }
                domain={domain}
                key={domain.id}
              />
            ))}
          </ul>
        </SettingsSection>
      ) : null}

      <AddDomainDialog devMode={devMode} />
    </SettingsPage>
  )
}
