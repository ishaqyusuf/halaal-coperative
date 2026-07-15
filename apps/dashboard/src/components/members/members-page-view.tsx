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
import { MembersDataTable } from "@/components/tables/members/data-table"
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
    <DashboardActionLink className="px-4" href="/member-signup-links">
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
          />

          <DashboardEmptyState
            body="The member registry could not load from the cooperative database right now. If you still open the create form, submissions will fail until the database connection is restored."
            title="Database-backed member records are not available yet."
          />
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

  return (
    <ScrollableContent>
      <div className="flex flex-col gap-6">
        <CollapsibleSummary>
          <section className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            <MembersAll
              filters={data.filters}
              totalCount={data.summary.totalCount}
            />
            <MembersActive
              activeCount={data.summary.activeCount}
              filters={data.filters}
            />
            <MembersKycPending
              filters={data.filters}
              kycPendingCount={data.summary.kycPendingCount}
            />
            <MembersLinkedUsers
              linkedUsersCount={data.summary.linkedUsersCount}
            />
          </section>
        </CollapsibleSummary>

        <MembersPageHeader
          createAction={
            data.canManageMembers ? <OpenMemberSheet /> : undefined
          }
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
          startWithImportPanelOpen={startWithImportPanelOpen}
        />

        <Suspense fallback={<MembersSkeleton />}>
          <MembersDataTable
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
