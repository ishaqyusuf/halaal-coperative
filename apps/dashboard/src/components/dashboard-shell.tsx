"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import type { CooperativeRole } from "@halaalvest/auth/roles"
import { getDashboardRouteTitle } from "@/lib/navigation/lib"
import { DeepLinkSheetPlaceholder } from "@/components/deep-link-sheet-placeholders"
import { GlobalSheetsProvider } from "@/components/sheets/global-sheets-provider"
import {
  DASHBOARD_SIDEBAR_COLLAPSED_WIDTH,
  DASHBOARD_SIDEBAR_EXPANDED_WIDTH,
} from "./dashboard/constants"
import { DashboardPageFrame } from "./dashboard/page"
import { DashboardSidebar } from "./dashboard/sidebar"
import { DashboardTopbar } from "./dashboard/topbar"

export function DashboardShellClient({
  children,
  hiddenNavPaths = [],
  role,
  shouldRedirectAdminToSetup = false,
  showLegalReminder = false,
  showSetupNav = false,
  tenantName,
  userName,
}: {
  children: React.ReactNode
  hiddenNavPaths?: string[]
  role: CooperativeRole | null
  /** Setup-gate flag from the layout; locks destinations it would redirect. */
  shouldRedirectAdminToSetup?: boolean
  showLegalReminder?: boolean
  /** Lead the sidebar with Getting started until the cooperative is live. */
  showSetupNav?: boolean
  tenantName: string
  userName: string
}) {
  const pathname = usePathname()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const { modules, pageSubtitle, pageTitle, roleLabel } =
    getDashboardRouteTitle(pathname, role, hiddenNavPaths)

  return (
    <div
      className="min-h-svh bg-background"
      style={{
        ["--dashboard-sidebar-offset" as string]:
          DASHBOARD_SIDEBAR_COLLAPSED_WIDTH,
        ["--dashboard-sidebar-offset-wide" as string]:
          DASHBOARD_SIDEBAR_EXPANDED_WIDTH,
      }}
    >
      <DashboardSidebar
        mobileOpen={mobileSidebarOpen}
        modules={modules}
        onMobileOpenChange={setMobileSidebarOpen}
        pathname={pathname}
        roleLabel={roleLabel}
        shouldRedirectAdminToSetup={shouldRedirectAdminToSetup}
        showSetupNav={showSetupNav || shouldRedirectAdminToSetup}
        tenantName={tenantName}
        userName={userName}
      />
      <GlobalSheetsProvider />
      <DeepLinkSheetPlaceholder />

      <div className="md:[padding-left:var(--dashboard-sidebar-offset)] lg:[padding-left:var(--dashboard-sidebar-offset-wide)]">
        <DashboardTopbar
          currentModuleSubtitle={pageSubtitle}
          onOpenMobileNav={() => setMobileSidebarOpen(true)}
          roleLabel={roleLabel}
          title={pageTitle}
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
