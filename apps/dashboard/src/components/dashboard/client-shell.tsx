"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import type { CooperativeRole } from "@halaal-vest/auth"
import {
  getDashboardQuickLinks,
  getDashboardRouteTitle,
} from "@/lib/navigation/lib"
import { DASHBOARD_SIDEBAR_COLLAPSED_WIDTH } from "./constants"
import { DashboardPageFrame } from "./page"
import { DashboardSidebar } from "./sidebar"
import { DashboardTopbar } from "./topbar"

export function DashboardShellClient({
  children,
  role,
  tenantName,
  userName,
}: {
  children: React.ReactNode
  role: CooperativeRole | null
  tenantName: string
  userName: string
}) {
  const pathname = usePathname()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const { activeItem, currentModule, modules, roleLabel } =
    getDashboardRouteTitle(pathname, role)
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
        currentModuleName={currentModule?.name}
        mobileOpen={mobileSidebarOpen}
        modules={modules}
        onMobileOpenChange={setMobileSidebarOpen}
        pathname={pathname}
        roleLabel={roleLabel}
        tenantName={tenantName}
        userName={userName}
      />

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
