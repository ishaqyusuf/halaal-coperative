"use client"

import type { ComponentProps } from "react"
import { Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@halaalvest/ui/components/input-group"
import { DropdownMenuTrigger } from "@halaalvest/ui/components/dropdown-menu"
import { cn } from "@halaalvest/ui/lib/utils"

export function MiddayFilterIcon({
  className,
}: {
  className?: string
}) {
  return (
    <svg
      aria-hidden="true"
      className={cn("size-4", className)}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M10 18h4v-2h-4v2ZM3 6v2h18V6H3Zm3 7h12v-2H6v2Z" />
    </svg>
  )
}

export function SearchFilterDropdownInput({
  filterActive,
  filterOpen,
  type = "search",
  ...props
}: ComponentProps<typeof InputGroupInput> & {
  filterActive: boolean
  filterOpen: boolean
}) {
  return (
    <InputGroup className="w-full sm:w-[350px]">
      <InputGroupAddon align="inline-start">
        <HugeiconsIcon icon={Search01Icon} size={16} />
      </InputGroupAddon>
      <InputGroupInput type={type} {...props} />
      <InputGroupAddon align="inline-end">
        <DropdownMenuTrigger
          render={
            <InputGroupButton
              aria-label="Toggle filters"
              className={cn(
                "text-muted-foreground",
                (filterActive || filterOpen) && "text-foreground",
              )}
              size="icon-xs"
            />
          }
        >
          <MiddayFilterIcon />
        </DropdownMenuTrigger>
      </InputGroupAddon>
    </InputGroup>
  )
}
