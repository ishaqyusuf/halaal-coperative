import { Suspense } from "react"
import type { MembersPageData } from "@/lib/members/load-members-page"
import type { getInitialMemberImportColumnSettings } from "@/lib/member-import-column-settings.server"
import {
  CollapsibleSummary,
  DashboardActionLink,
  DashboardEmptyState,
  ScrollableContent,
} from "@/components/dashboard"
import { MemberImportPanel } from "@/components/member-import-panel"
import { OpenMemberSheet } from "@/components/open-member-sheet"
import { MemberSheet } from "@/components/sheets/member-sheet"
import { MembersDataView } from "@/components/tables/members/data-view"
import { MembersSkeleton } from "@/components/tables/members/skeleton"
import type { TableSettings } from "@/utils/table-settings"
import { MembersActive } from "./members-active"
import { MembersAll } from "./members-all"
import { MembersHeader as MembersPageHeader } from "./members-header"
import { MembersKycPending } from "./members-kyc-pending"
import { MembersLinkedUsers } from "./members-linked-users"

type MemberImportColumnSettings = Awaited<
  ReturnType<typeof getInitialMemberImportColumnSettings>
>

function SignupLinkAction() {
  return (
    <DashboardActionLink href="/member-signup-links">
      Open link generator
    </DashboardActionLink>
  )
}

export function MembersPageView({
  data,
  initialImportColumnSettings,
  initialSettings,
  startWithImportPanelOpen,
}: {
  data: MembersPageData
  initialImportColumnSettings: MemberImportColumnSettings
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
                ? "The full member directory is restricted to cooperative staff. Members can use their own dashboard and statement routes for personal records."
                : "The member registry could not load from the cooperative database right now. If you still open the create form, submissions will fail until the database connection is restored."
            }
            title={
              data.accessDenied
                ? "Staff member access is required."
                : "Database-backed member records are not available yet."
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
            <section className="grid grid-cols-2 gap-6 pt-6 lg:grid-cols-4">
              <MembersAll
                filters={data.filters}
                migrationFinalizedCount={data.summary.migrationFinalizedCount}
                migrationSetupMode={
                  data.tenant?.migrationSetupMode ?? "historical_backfill"
                }
                totalCount={data.summary.totalCount}
              />
              <MembersActive
                activeCount={data.summary.activeCount}
                filters={data.filters}
              />
              <MembersKycPending
                kycPendingCount={data.summary.kycPendingCount}
              />
              <MembersLinkedUsers
                linkedUsersCount={data.summary.linkedUsersCount}
              />
            </section>
          </CollapsibleSummary>
        </div>

        <MembersPageHeader
          createAction={data.canManageMembers ? <OpenMemberSheet /> : undefined}
          importPanel={
            data.canManageImports && data.referenceData ? (
              <MemberImportPanel
                batches={data.batches}
                devMode={data.quickFillEnabled}
                initialColumnSettings={initialImportColumnSettings}
                referenceData={data.referenceData}
              />
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
