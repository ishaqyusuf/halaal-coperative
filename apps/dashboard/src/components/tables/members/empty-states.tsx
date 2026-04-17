"use client"

import { Button } from "@halaal-vest/ui/components/button"

export function MembersEmptyState() {
  return (
    <div className="flex items-center justify-center">
      <div className="mt-40 flex flex-col items-center">
        <div className="mb-6 space-y-2 text-center">
          <h2 className="text-lg font-medium">No members</h2>
          <p className="text-sm text-[#606060]">
            You haven&apos;t created any members yet. <br />
            Go ahead and create your first one.
          </p>
        </div>
      </div>
    </div>
  )
}

export function MembersNoResults() {
  return (
    <div className="flex items-center justify-center">
      <div className="mt-40 flex flex-col items-center">
        <div className="mb-6 space-y-2 text-center">
          <h2 className="text-lg font-medium">No results</h2>
          <p className="text-sm text-[#606060]">
            Try another search, or adjusting the filters
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            window.location.href = "/members"
          }}
        >
          Clear filters
        </Button>
      </div>
    </div>
  )
}
