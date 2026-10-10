"use client"

import { ResponsiveDataView } from "@/components/tables/core/responsive-data-view"
import type { TableSettings } from "@/utils/table-settings"
import { ChargeLibraryDataTable } from "./data-table"
import { ChargeLibraryMobileList } from "./mobile-list"
import { ChargeLibrarySkeleton } from "./skeleton"

export function ChargeLibraryDataView({ canManageCharges, initialSettings }: { canManageCharges: boolean; initialSettings?: Partial<TableSettings> }) {
  return <ResponsiveDataView desktop={<ChargeLibraryDataTable canManageCharges={canManageCharges} initialSettings={initialSettings} />} fallback={<ChargeLibrarySkeleton />} mobile={<ChargeLibraryMobileList canManageCharges={canManageCharges} />} />
}
