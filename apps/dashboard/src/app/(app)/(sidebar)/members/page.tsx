import type { Metadata } from "next"
import { MembersPageView } from "@/components/members/members-page-view"
import {
  loadMembersFilterParams,
  type MembersFilterParams,
} from "@/hooks/use-members-filter-params"
import { loadSortParams } from "@/hooks/use-sort-params"
import { loadMembersPageData } from "@/lib/members"
import { getMembersListInput } from "@/lib/members/member-list-input"
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server"
import { getInitialTableSettings } from "@/utils/columns"

type SearchParams = Record<string, string | string[] | undefined>

export const metadata: Metadata = {
  title: "Members | Halaalvest",
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
  const [initialSettings, data] = await Promise.all([
    getInitialTableSettings("members"),
    loadMembersPageData(filters),
  ])

  if (data.state !== "ready") {
    return (
      <MembersPageView
        data={data}
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
  batchPrefetch([membersListOptions])

  return (
    <HydrateClient>
      <MembersPageView
        data={data}
        initialSettings={initialSettings}
        startWithImportPanelOpen={startWithImportPanelOpen}
      />
    </HydrateClient>
  )
}
