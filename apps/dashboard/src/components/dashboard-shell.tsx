"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import type { CooperativeRole } from "@halaalvest/auth/roles"
import {
  getDashboardQuickLinks,
  getDashboardRouteTitle,
} from "@/lib/navigation/lib"
import { GlobalSheetsProvider } from "@/components/sheets/global-sheets-provider"
import { DASHBOARD_SIDEBAR_COLLAPSED_WIDTH } from "./dashboard/constants"
import { DashboardPageFrame } from "./dashboard/page"
import { DashboardSidebar } from "./dashboard/sidebar"
import { DashboardTopbar } from "./dashboard/topbar"

export function DashboardShellClient({
  children,
  hiddenNavPaths = [],
  role,
  tenantName,
  userName,
}: {
  children: React.ReactNode
  hiddenNavPaths?: string[]
  role: CooperativeRole | null
  tenantName: string
  userName: string
}) {
  const pathname = usePathname()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const { activeItem, currentModule, modules, roleLabel } =
    getDashboardRouteTitle(pathname, role, hiddenNavPaths)
  const quickLinks = getDashboardQuickLinks(pathname, modules)

  return (
    <div
      className="min-h-svh bg-background"
      style={{
        ["--dashboard-sidebar-offset" as string]:
          DASHBOARD_SIDEBAR_COLLAPSED_WIDTH,
      }}
    >
      <DashboardSidebar
        mobileOpen={mobileSidebarOpen}
        modules={modules}
        onMobileOpenChange={setMobileSidebarOpen}
        pathname={pathname}
        roleLabel={roleLabel}
        tenantName={tenantName}
        userName={userName}
      />
      <GlobalSheetsProvider />

      <div className="md:[padding-left:var(--dashboard-sidebar-offset)]">
        <DashboardTopbar
          currentModuleSubtitle={currentModule?.subtitle}
          onOpenMobileNav={() => setMobileSidebarOpen(true)}
          quickLinks={quickLinks}
          roleLabel={roleLabel}
          title={activeItem?.title ?? "Dashboard"}
          userName={userName}
        />
        <DashboardPageFrame>{children}</DashboardPageFrame>
      </div>
    </div>
  )
}
