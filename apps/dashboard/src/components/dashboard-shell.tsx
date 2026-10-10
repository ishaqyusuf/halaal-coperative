"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import type { CooperativeRole } from "@halaalvest/auth/roles"
import { getDashboardRouteTitle } from "@/lib/navigation/lib"
import { GlobalSheetsProvider } from "@/components/sheets/global-sheets-provider"
import { DASHBOARD_SIDEBAR_COLLAPSED_WIDTH } from "./dashboard/constants"
import { DashboardPageFrame } from "./dashboard/page"
import { DashboardSidebar } from "./dashboard/sidebar"
import { DashboardTopbar } from "./dashboard/topbar"

export function DashboardShellClient({
  children,
  hiddenNavPaths = [],
  role,
  showLegalReminder = false,
  tenantName,
  userName,
}: {
  children: React.ReactNode
  hiddenNavPaths?: string[]
  role: CooperativeRole | null
  showLegalReminder?: boolean
  tenantName: string
  userName: string
}) {
  const pathname = usePathname()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const { activeItem, currentModule, modules, roleLabel } =
    getDashboardRouteTitle(pathname, role, hiddenNavPaths)

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
          roleLabel={roleLabel}
          title={activeItem?.title ?? "Dashboard"}
          userName={userName}
        />
        <DashboardPageFrame>
          {showLegalReminder && pathname !== "/settings/platform-documents" ? (
            <div
              className="rounded-lg border border-border bg-card px-4 py-3 text-sm"
              role="status"
            >
              Current platform terms and privacy notice are ready for your
              review. You can keep using your workspace.{" "}
              <Link
                className="font-semibold text-primary underline underline-offset-4"
                href="/settings/platform-documents"
              >
                Review platform documents
              </Link>
            </div>
          ) : null}
          {children}
        </DashboardPageFrame>
      </div>
    </div>
  )
}
