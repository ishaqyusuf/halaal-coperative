"use client"

import { Button } from "@halaalvest/ui/components/button"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@halaalvest/ui/components/popover"
import { SlidersHorizontal } from "lucide-react"
import { useMembersStore } from "@/store/members"

export function MembersColumnVisibility() {
  const { columns } = useMembersStore()

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            aria-label="Configure member columns"
            size="icon"
            variant="outline"
          />
        }
      >
        <SlidersHorizontal size={18} />
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[220px] p-0" sideOffset={8}>
        <div className="flex max-h-[400px] flex-col space-y-2 overflow-auto p-4">
          {columns
            .filter(
              (column) =>
                column.columnDef.enableHiding !== false &&
                column.id !== "actions"
            )
            .map((column) => {
              const meta = column.columnDef.meta as
                | { headerLabel?: string }
                | undefined
              const label =
                meta?.headerLabel ??
                column.columnDef.header?.toString() ??
                column.id

              return (
                <div className="flex items-center space-x-2" key={column.id}>
                  <Checkbox
                    checked={column.getIsVisible()}
                    id={column.id}
                    onCheckedChange={(checked) =>
                      column.toggleVisibility(checked === true)
                    }
                  />
                  <label
                    className="text-sm peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    htmlFor={column.id}
                  >
                    {label}
                  </label>
                </div>
              )
            })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
