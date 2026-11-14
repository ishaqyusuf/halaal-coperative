import type { ComponentProps } from "react"
import { OpenOperationProfileSettingsSheet } from "@/components/open-operation-profile-settings-sheet"
import { OperationProfileSettingsSheet } from "@/components/sheets/operation-profile-settings-sheet"
import {
  SettingsEmpty,
  SettingsPage,
  SettingsSection,
} from "@/components/workspace-settings/settings-page"
import {
  getOperationProfileAccessModeLabel,
  getOperationProfileService,
  operationProfileServiceSections,
} from "@/lib/settings/operation-profile-settings"

type OperationProfileSettingsSheetProps = ComponentProps<
  typeof OperationProfileSettingsSheet
>

export function OperationProfileSettingsUnavailableView({
  body,
  title,
}: {
  body: string
  title: string
}) {
  return (
    <SettingsPage>
      <SettingsEmpty body={body} title={title} />
    </SettingsPage>
  )
}

export function OperationProfileSettingsView({
  policy,
  services,
}: OperationProfileSettingsSheetProps) {
  return (
    <SettingsPage intro="Which services your cooperative offers, and who can start them.">
      {operationProfileServiceSections.map((section) => (
        <div data-operation-profile-section={section.key} key={section.key}>
          <SettingsSection description={section.body} title={section.label}>
            <ul className="divide-y divide-border border-y border-border">
              {section.serviceKeys.map((serviceKey) => {
                const service = getOperationProfileService(serviceKey)
                const accessMode = services[service.key].accessMode

                return (
                  <li
                    className="flex flex-col gap-3 px-1 py-4 sm:flex-row sm:items-center sm:px-3"
                    data-operation-profile-service={service.key}
                    key={service.key}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-semibold text-foreground">
                        {service.label}
                      </p>
                      <p className="text-base text-muted-foreground">
                        {service.body}
                      </p>
                      <p className="mt-1 text-base text-foreground">
                        {getOperationProfileAccessModeLabel(accessMode)}
                      </p>
                    </div>
                    <OpenOperationProfileSettingsSheet
                      serviceKey={service.key}
                      serviceLabel={service.label}
                    />
                  </li>
                )
              })}
            </ul>
          </SettingsSection>
        </div>
      ))}

      <OperationProfileSettingsSheet policy={policy} services={services} />
    </SettingsPage>
  )
}
