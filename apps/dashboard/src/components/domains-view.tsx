import type { TenantDomainRecord } from "@halaalvest/db"
import { AddDomainDialog } from "@/components/domains/add-domain-dialog"
import {
  CheckDomainButton,
  MakeMainDomainButton,
  OpenAddDomainButton,
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
  const main =
    domains.find((domain) => domain.isPrimary) ??
    domains.find((domain) => isPlatformDomain(domain)) ??
    null
  const others = domains.filter((domain) => domain.id !== main?.id)

  return (
    <SettingsPage
      action={<OpenAddDomainButton />}
      intro="The web address members use to reach your cooperative."
    >
      <SettingsSection title="Main address">
        {main ? (
          <ul className="border-y border-border">
            <DomainRow domain={main} />
          </ul>
        ) : (
          <SettingsEmpty
            body="Contact support to set up your web address."
            title="No web address yet"
          />
        )}
      </SettingsSection>

      {others.length > 0 ? (
        <SettingsSection title="Other addresses">
          <ul className="divide-y divide-border border-y border-border">
            {others.map((domain) => {
              const status = getDomainStatus(domain)

              return (
                <DomainRow
                  actions={
                    <>
                      {isPlatformDomain(domain) ? null : (
                        <CheckDomainButton
                          domainId={domain.id}
                          hostname={domain.hostname}
                        />
                      )}
                      {status.ready ? (
                        <MakeMainDomainButton
                          currentMain={main?.hostname ?? null}
                          domainId={domain.id}
                          hostname={domain.hostname}
                        />
                      ) : null}
                    </>
                  }
                  domain={domain}
                  key={domain.id}
                />
              )
            })}
          </ul>
        </SettingsSection>
      ) : null}

      <AddDomainDialog devMode={devMode} />
    </SettingsPage>
  )
}
