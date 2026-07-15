import { MembersPageView } from "@/components/members/members-page-view"
import {
  loadMembersFilterParams,
  type MembersFilterParams,
} from "@/hooks/use-members-filter-params"
import { loadSortParams } from "@/hooks/use-sort-params"
import { getInitialMemberImportColumnSettings } from "@/lib/member-import-column-settings.server"
import { loadMembersPageData } from "@/lib/members"
import {
  getQueryClient,
  getServerCaller,
  HydrateClient,
  trpc,
} from "@/trpc/server"
import { getInitialTableSettings } from "@/utils/columns"

type SearchParams = Record<string, string | string[] | undefined>

type MembersSortField =
  | "fullName"
  | "memberNumber"
  | "memberType"
  | "status"
  | "kycStatus"
  | "joinedAt"

function getSort(
  sort?: string[] | null
): [MembersSortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const field = sort[0]
  const direction = sort[1]
  if (!field || !direction) return null

  const validFields = new Set<string>([
    "fullName",
    "memberNumber",
    "memberType",
    "status",
    "kycStatus",
    "joinedAt",
  ])

  if (!validFields.has(field)) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [field as MembersSortField, direction]
}

function getEnumValue<TValue extends string>(
  value: string | null,
  validValues: readonly TValue[]
) {
  return validValues.includes(value as TValue) ? (value as TValue) : undefined
}

function getMembersListInput(
  filters: MembersFilterParams,
  sort?: string[] | null
) {
  return {
    joinedFrom: filters.joinedFrom ?? undefined,
    joinedTo: filters.joinedTo ?? undefined,
    kycStatus: getEnumValue(filters.kycStatus, [
      "not_started",
      "pending",
      "verified",
      "rejected",
    ] as const),
    memberType: getEnumValue(filters.memberType, [
      "civil_servant",
      "individual",
      "business",
    ] as const),
    q: filters.q ?? undefined,
    sort: getSort(sort),
    status: getEnumValue(filters.status, [
      "pending",
      "active",
      "inactive",
      "suspended",
      "exited",
    ] as const),
  }
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const filters = loadMembersFilterParams(params)
  const { sort } = loadSortParams(params)
  const startWithImportPanelOpen = params.import === "1"
  const [initialSettings, initialImportColumnSettings, data] =
    await Promise.all([
      getInitialTableSettings("members"),
      getInitialMemberImportColumnSettings(),
      loadMembersPageData(filters),
    ])

  if (data.state !== "ready") {
    return (
      <MembersPageView
        data={data}
        initialImportColumnSettings={initialImportColumnSettings}
        initialSettings={initialSettings}
        startWithImportPanelOpen={startWithImportPanelOpen}
      />
    )
  }

  const membersListInput = getMembersListInput(filters, sort)
  const membersListOptions = trpc.members.list.infiniteQueryOptions(
    membersListInput,
    {
      getNextPageParam: ({ meta }) => meta?.cursor,
    }
  )
  const caller = await getServerCaller()
  const initialMembersPage = await caller.members.list(membersListInput)

  getQueryClient().setQueryData(membersListOptions.queryKey, {
    pageParams: [membersListOptions.initialPageParam],
    pages: [initialMembersPage],
  })

  return (
    <HydrateClient>
      <MembersPageView
        data={data}
        initialImportColumnSettings={initialImportColumnSettings}
        initialSettings={initialSettings}
        startWithImportPanelOpen={startWithImportPanelOpen}
      />
    </HydrateClient>
  )
}
