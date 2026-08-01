"use client"

import type { TenantMigrationSetupMode } from "@halaalvest/db"
import { Button } from "@halaalvest/ui/components/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@halaalvest/ui/components/input-group"
import { MoreHorizontal, Search, Upload } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { OpenMemberSheet } from "@/components/open-member-sheet"
import { MembersFilterDrawer } from "@/components/members/members-filter-drawer"
import { MiddayFilterIcon } from "@/components/search-filter-dropdown-input"
import { MobileActionsDrawer } from "@/components/tables/core/mobile-actions-drawer"
import {
  clearedMembersControlsParams,
  useMembersControlsParams,
} from "@/hooks/use-members-filter-params"
import { useMemberParams } from "@/hooks/use-member-params"

export function MembersMobileToolbar({
  canCreateMember,
  canImportMembers,
  migrationSetupMode,
  showSignupLink,
}: {
  canCreateMember: boolean
  canImportMembers: boolean
  migrationSetupMode: TenantMigrationSetupMode
  showSignupLink: boolean
}) {
  const router = useRouter()
  const { setParams: setMemberParams } = useMemberParams()
  const { hasActiveControls, params, setParams } = useMembersControlsParams()
  const [filterOpen, setFilterOpen] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const hasSecondaryActions = canImportMembers || showSignupLink

  function openImport() {
    setActionsOpen(false)
    void setMemberParams({
      memberSheetType: "import",
      selectedMemberId: null,
      selectedMemberStatus: null,
    })
  }

  function openSignupLinks() {
    setActionsOpen(false)
    router.push("/member-signup-links")
  }

  return (
    <>
      <div className="space-y-3 md:hidden" data-members-mobile-header>
        <form
          className="w-full"
          data-quick-fill-exempt="true"
          onSubmit={(event) => event.preventDefault()}
        >
          <InputGroup className="h-11">
            <InputGroupAddon align="inline-start">
              <Search aria-hidden="true" className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Search members"
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
              onChange={(event) => setParams({ q: event.target.value || null })}
              placeholder="Search members..."
              spellCheck="false"
              type="search"
              value={params.q ?? ""}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                aria-label="Filter members"
                className={
                  hasActiveControls
                    ? "size-9 text-foreground"
                    : "size-9 text-muted-foreground"
                }
                onClick={() => setFilterOpen(true)}
                size="icon-sm"
              >
                <MiddayFilterIcon />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </form>

        <div className="flex min-h-11 items-center justify-between gap-2">
          <div>
            {hasActiveControls ? (
              <Button
                className="h-11"
                onClick={() => setParams(clearedMembersControlsParams)}
                type="button"
                variant="outline"
              >
                Clear filters
              </Button>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {hasSecondaryActions ? (
              <Button
                aria-label="More member actions"
                className="size-11"
                onClick={() => setActionsOpen(true)}
                size="icon-lg"
                type="button"
                variant="outline"
              >
                <MoreHorizontal />
              </Button>
            ) : null}
            {canCreateMember ? <OpenMemberSheet iconOnly /> : null}
          </div>
        </div>
      </div>

      {filterOpen ? (
        <MembersFilterDrawer
          migrationSetupMode={migrationSetupMode}
          onOpenChange={setFilterOpen}
          open={filterOpen}
        />
      ) : null}

      <MobileActionsDrawer
        description="Choose a member-registry action."
        onOpenChange={setActionsOpen}
        open={actionsOpen}
        title="Member actions"
      >
        <div className="space-y-2">
          {canImportMembers ? (
            <Button
              className="h-11 w-full justify-start"
              onClick={openImport}
              type="button"
              variant="ghost"
            >
              <Upload data-icon="inline-start" />
              Import members
            </Button>
          ) : null}
          {showSignupLink ? (
            <Button
              className="h-11 w-full justify-start"
              onClick={openSignupLinks}
              type="button"
              variant="ghost"
            >
              Open link generator
            </Button>
          ) : null}
        </div>
      </MobileActionsDrawer>
    </>
  )
}
