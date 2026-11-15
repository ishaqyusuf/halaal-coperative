import { Suspense } from "react"
import type { MembersPageData } from "@/lib/members/load-members-page"
import {
  CollapsibleSummary,
  DashboardActionLink,
  DashboardEmptyState,
  ScrollableContent,
} from "@/components/dashboard"
import { OpenMemberSheet } from "@/components/open-member-sheet"
import { MembersDataView } from "@/components/tables/members/data-view"
import { MembersSkeleton } from "@/components/tables/members/skeleton"
import type { TableSettings } from "@/utils/table-settings"
import { MembersActive } from "./members-active"
import { MembersAll } from "./members-all"
import { MembersHeader as MembersPageHeader } from "./members-header"
import { MembersKycPending } from "./members-kyc-pending"
import { MemberImportPanel, MemberSheet } from "./members-lazy-sheets"
import { MembersOpeningPending } from "./members-opening-pending"

function SignupLinkAction() {
  return (
    <DashboardActionLink href="/member-signup-links">
      Sign-up link
    </DashboardActionLink>
  )
}

export function MembersPageView({
  data,
  initialSettings,
  startWithImportPanelOpen,
}: {
  data: MembersPageData
  initialSettings: Partial<TableSettings>
  startWithImportPanelOpen: boolean
}) {
  if (data.state !== "ready") {
    return (
      <ScrollableContent>
        <div className="flex flex-col gap-6">
          <MembersPageHeader
            createAction={
              data.canManageMembers ? <OpenMemberSheet /> : undefined
            }
            secondaryActions={
              data.canManageMembers ? <SignupLinkAction /> : undefined
            }
            migrationSetupMode={data.tenant?.migrationSetupMode}
          />

          <DashboardEmptyState
            body={
              data.accessDenied
                ? "Only cooperative staff can see the member list."
                : "Try again in a moment."
            }
            title={
              data.accessDenied ? "Staff only" : "Members can't load right now."
            }
          />
          {data.accessDenied ? null : (
            <MemberSheet
              canManageCollectionSources={data.canManageCollectionSources}
              collectionSourceOptions={data.collectionSourceOptions}
              cooperativeStartDate={data.tenant?.startDate}
              devMode={data.quickFillEnabled}
              memberNumberPrefix={data.tenant?.memberNumberPrefix}
              migrationSetupMode={data.tenant?.migrationSetupMode}
            />
          )}
        </div>
      </ScrollableContent>
    )
  }

  return (
    <ScrollableContent>
      <div className="flex flex-col gap-6">
        <div className="hidden md:block">
          <CollapsibleSummary>
            <section className="grid grid-cols-2 gap-3 pt-6 lg:grid-cols-4">
              <MembersAll
                filters={data.filters}
                totalCount={data.summary.totalCount}
              />
              <MembersActive
                activeCount={data.summary.activeCount}
                filters={data.filters}
              />
              <MembersKycPending
                kycPendingCount={data.summary.kycPendingCount}
              />
              <MembersOpeningPending
                filters={data.filters}
                migrationFinalizedCount={data.summary.migrationFinalizedCount}
                migrationSetupMode={
                  data.tenant?.migrationSetupMode ?? "historical_backfill"
                }
                totalCount={data.summary.totalCount}
              />
            </section>
          </CollapsibleSummary>
        </div>

        <MembersPageHeader
          createAction={data.canManageMembers ? <OpenMemberSheet /> : undefined}
          importPanel={
            data.canManageImports ? (
              <MemberImportPanel devMode={data.quickFillEnabled} />
            ) : undefined
          }
          secondaryActions={
            data.canManageMembers &&
            data.signupSettings.memberSignupAccessMode !== "public" ? (
              <SignupLinkAction />
            ) : undefined
          }
          migrationSetupMode={data.tenant?.migrationSetupMode}
          startWithImportPanelOpen={startWithImportPanelOpen}
        />

        <Suspense fallback={<MembersSkeleton />}>
          <MembersDataView
            canManageMembers={data.canManageMembers}
            initialSettings={initialSettings}
          />
        </Suspense>

        <MemberSheet
          canManageCollectionSources={data.canManageCollectionSources}
          collectionSourceOptions={data.collectionSourceOptions}
          cooperativeStartDate={data.tenant?.startDate}
          devMode={data.quickFillEnabled}
          memberNumberPrefix={data.tenant?.memberNumberPrefix}
          migrationSetupMode={data.tenant?.migrationSetupMode}
        />
      </div>
    </ScrollableContent>
  )
}
