"use client"

import type { RefObject } from "react"
import {
  closestCenter,
  DndContext,
  PointerSensor,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@halaalvest/ui/components/button"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@halaalvest/ui/components/popover"
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@halaalvest/ui/components/dialog"
import { cn } from "@halaalvest/ui/lib/utils"
import { GripVertical, SlidersHorizontal } from "lucide-react"
import { updateMemberImportColumnSettingsAction } from "@/actions/update-member-import-column-settings-action"
import { downloadDashboardImportTemplate } from "@/lib/import-excel"
import {
  memberImportRequiredColumns,
  normalizeMemberImportColumnSettings,
  type MemberImportColumnSettings,
} from "@/lib/member-import-column-settings"

function formatImportColumnLabel(column: string) {
  return column
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
}

function MemberImportColumnFilterItem({
  column,
  checked,
  disabled,
  onCheckedChange,
}: {
  column: string
  checked: boolean
  disabled: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5",
        isDragging && "bg-background shadow-sm"
      )}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <Checkbox
        aria-label={`Toggle ${formatImportColumnLabel(column)}`}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(nextChecked) => onCheckedChange(nextChecked === true)}
      />
      <div
        className="flex min-w-0 flex-1 cursor-grab items-center gap-2 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-sm text-foreground",
            disabled && "text-muted-foreground"
          )}
        >
          {formatImportColumnLabel(column)}
        </span>
        <GripVertical className="size-4 shrink-0 text-muted-foreground" />
      </div>
    </div>
  )
}

function MemberImportColumnFilter({
  settings,
  onSettingsChange,
}: {
  settings: MemberImportColumnSettings
  onSettingsChange: (settings: MemberImportColumnSettings) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  function updateSettings(nextSettings: MemberImportColumnSettings) {
    const normalized = normalizeMemberImportColumnSettings(nextSettings)
    onSettingsChange(normalized)
    void updateMemberImportColumnSettingsAction(normalized).catch((error) => {
      console.error("Failed to persist member import column settings:", error)
    })
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = settings.order.indexOf(active.id as string)
    const newIndex = settings.order.indexOf(over.id as string)

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    updateSettings({
      ...settings,
      order: arrayMove(settings.order, oldIndex, newIndex),
    })
  }

  function setColumnVisible(column: string, visible: boolean) {
    if (memberImportRequiredColumns.has(column)) {
      return
    }

    updateSettings({
      ...settings,
      visible: {
        ...settings.visible,
        [column]: visible,
      },
    })
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            aria-label="Configure import columns"
            className="rounded-full"
            size="icon"
            type="button"
            variant="outline"
          />
        }
      >
        <SlidersHorizontal size={18} />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[calc(100vw-2rem)] max-w-[300px] p-0"
        sideOffset={8}
      >
        <div className="border-b border-border/70 px-4 py-3">
          <p className="text-sm font-medium text-foreground">Import columns</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Check columns to include. Drag labels to reorder.
          </p>
        </div>
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
          sensors={sensors}
        >
          <SortableContext
            items={settings.order}
            strategy={verticalListSortingStrategy}
          >
            <div className="max-h-[420px] overflow-auto p-2">
              {settings.order.map((column) => {
                const required = memberImportRequiredColumns.has(column)

                return (
                  <MemberImportColumnFilterItem
                    checked={required || settings.visible[column] !== false}
                    column={column}
                    disabled={required}
                    key={column}
                    onCheckedChange={(visible) =>
                      setColumnVisible(column, visible)
                    }
                  />
                )
              })}
            </div>
          </SortableContext>
        </DndContext>
      </PopoverContent>
    </Popover>
  )
}

export function MemberImportSheetHeader({
  activeColumns,
  columnSettings,
  devMode,
  fileInputRef,
  isReadingFile,
  onClose,
  onColumnSettingsChange,
  onImportFile,
  onQuickFill,
}: {
  activeColumns: string[]
  columnSettings: MemberImportColumnSettings
  devMode: boolean
  fileInputRef: RefObject<HTMLInputElement | null>
  isReadingFile: boolean
  onClose: () => void
  onColumnSettingsChange: (settings: MemberImportColumnSettings) => void
  onImportFile: (file: File | undefined) => void
  onQuickFill: () => void
}) {
  return (
    <DialogHeader className="border-b border-border/70 px-4 py-4 text-left sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div>
        <p className="text-[11px] font-medium text-muted-foreground uppercase">
          Import
        </p>
        <DialogTitle>Import members</DialogTitle>
        <DialogDescription>
          Review member rows, then import now or stage for later review.
        </DialogDescription>
      </div>
      <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
        <input
          ref={fileInputRef}
          accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          type="file"
          onChange={(event) => onImportFile(event.target.files?.[0])}
        />
        <MemberImportColumnFilter
          settings={columnSettings}
          onSettingsChange={onColumnSettingsChange}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            downloadDashboardImportTemplate("members", activeColumns)
          }
        >
          Download Excel template
        </Button>
        <Button
          disabled={isReadingFile}
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          {isReadingFile ? "Reading file..." : "Upload Excel/CSV"}
        </Button>
        {devMode ? (
          <Button type="button" variant="outline" onClick={onQuickFill}>
            Quick fill
          </Button>
        ) : null}
        <Button type="button" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
    </DialogHeader>
  )
}
