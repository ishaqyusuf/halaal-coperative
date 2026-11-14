import type { ComponentProps } from "react"
import { CheckCircle2, Circle } from "lucide-react"
import { DashboardActionLink } from "@/components/dashboard"
import { OpenTrustSettingsSheet } from "@/components/open-trust-settings-sheet"
import { TrustSettingsSheet } from "@/components/sheets/trust-settings-sheet"
import {
  SettingsEmpty,
  SettingsPage,
  SettingsSection,
} from "@/components/workspace-settings/settings-page"
import type { loadTrustReadinessPageData } from "@/lib/settings/load-trust-readiness-page"
import { formatDayMonthYear } from "@/utils/format"

type TrustReadinessData = Awaited<ReturnType<typeof loadTrustReadinessPageData>>
type TrustSettingsSheetDefaults = ComponentProps<
  typeof TrustSettingsSheet
>["defaultValues"]

export function TrustSettingsUnavailableView() {
  return (
    <SettingsPage>
      <SettingsEmpty
        body="Only cooperative admins can see this page."
        title="Not available"
      />
    </SettingsPage>
  )
}

export function TrustSettingsView({
  data,
  defaultValues,
}: {
  data: TrustReadinessData
  defaultValues: TrustSettingsSheetDefaults
}) {
  const savedOn = formatDayMonthYear(data.lastSavedAt)

  return (
    <SettingsPage
      action={<OpenTrustSettingsSheet />}
      intro="What members and partners may ask before they trust you with their money."
    >
      <SettingsSection
        description={`${data.doneCount} of ${data.items.length} done${savedOn ? `. Last saved ${savedOn}.` : "."}`}
        title="Checklist"
      >
        <ul className="divide-y divide-border border-y border-border">
          {data.items.map((item) => (
            <li
              className="flex flex-col gap-3 px-1 py-4 sm:flex-row sm:items-center sm:px-3"
              data-trust-readiness-item={item.key}
              key={item.key}
            >
              <div className="flex min-w-0 flex-1 gap-3">
                {item.done ? (
                  <CheckCircle2
                    aria-hidden="true"
                    className="mt-0.5 size-6 shrink-0 text-primary"
                  />
                ) : (
                  <Circle
                    aria-hidden="true"
                    className="mt-0.5 size-6 shrink-0 text-muted-foreground"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-foreground">
                    {item.label}
                    <span className="sr-only">
                      {item.done ? " (done)" : " (to do)"}
                    </span>
                  </p>
                  <p className="text-base [overflow-wrap:anywhere] text-muted-foreground">
                    {item.detail}
                  </p>
                </div>
              </div>
              {item.actionHref && item.actionLabel ? (
                <DashboardActionLink
                  className="h-11 w-full text-base sm:w-auto"
                  href={item.actionHref}
                >
                  {item.actionLabel}
                </DashboardActionLink>
              ) : null}
            </li>
          ))}
        </ul>
        <p className="text-base text-muted-foreground">
          Saving a link doesn&apos;t mean a lawyer has checked the document.
        </p>
      </SettingsSection>

      <TrustSettingsSheet defaultValues={defaultValues} />
    </SettingsPage>
  )
}
