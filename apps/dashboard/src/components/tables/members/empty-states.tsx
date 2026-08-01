"use client"

import { Button } from "@halaalvest/ui/components/button"
import { useMemberParams } from "@/hooks/use-member-params"
import {
  clearedMembersControlsParams,
  useMembersControlsParams,
} from "@/hooks/use-members-filter-params"

export function MembersEmptyState({
  canManageMembers,
}: {
  canManageMembers: boolean
}) {
  const { setParams } = useMemberParams()

  return (
    <div className="flex items-center justify-center">
      <div className="mt-16 flex flex-col items-center md:mt-40">
        <div className="mb-6 space-y-2 text-center">
          <h2 className="text-lg font-medium">No members</h2>
          <p className="text-sm text-[#606060]">
            You haven&apos;t created any members yet. <br />
            Go ahead and create your first one.
          </p>
        </div>
        {canManageMembers ? (
          <Button
            variant="outline"
            onClick={() =>
              setParams({
                memberSheetType: "create",
                selectedMemberId: null,
                selectedMemberStatus: null,
              })
            }
          >
            Create member
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export function MembersNoResults() {
  const { setParams } = useMembersControlsParams()

  return (
    <div className="flex items-center justify-center">
      <div className="mt-16 flex flex-col items-center md:mt-40">
        <div className="mb-6 space-y-2 text-center">
          <h2 className="text-lg font-medium">No results</h2>
          <p className="text-sm text-[#606060]">
            Try another search, or adjusting the filters
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => setParams(clearedMembersControlsParams)}
        >
          Clear filters
        </Button>
      </div>
    </div>
  )
}
