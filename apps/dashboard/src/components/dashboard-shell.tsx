"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import type { CooperativeRole } from "@halaalvest/auth/roles"
import {
  canAccessDashboardPath,
  getDashboardRouteTitle,
} from "@/lib/navigation/lib"
import { QuickAssistant } from "@/components/quick-assistant/quick-assistant"
import { DeepLinkSheetPlaceholder } from "@/components/deep-link-sheet-placeholders"
import { GlobalSheetsProvider } from "@/components/sheets/global-sheets-provider"
import {
  DASHBOARD_SIDEBAR_COLLAPSED_WIDTH,
  DASHBOARD_SIDEBAR_EXPANDED_WIDTH,
} from "./dashboard/constants"
import { DashboardPageFrame } from "./dashboard/page"
import { DashboardRouteTitleProvider } from "./dashboard/route-title-context"
import { DashboardSidebar } from "./dashboard/sidebar"
import { DashboardTopbar } from "./dashboard/topbar"

export function DashboardShellClient({
  children,
  hiddenNavPaths = [],
  isPlatformOwner = false,
  role,
  shouldRedirectAdminToSetup = false,
  showSetupNav = false,
  tenantName,
  userName,
}: {
  children: React.ReactNode
  hiddenNavPaths?: string[]
  /** Platform operators get a "Platform admin" link in the account menu. */
  isPlatformOwner?: boolean
  role: CooperativeRole | null
  /** Setup-gate flag from the layout; locks destinations it would redirect. */
  shouldRedirectAdminToSetup?: boolean
  /** Lead the sidebar with Getting started until the cooperative is live. */
  showSetupNav?: boolean
  tenantName: string
  userName: string
}) {
  const pathname = usePathname()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const { isSectionRoot, modules, pageSubtitle, pageTitle, roleLabel } =
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
          assistant={
            canAccessDashboardPath("/assistant", role) &&
            !hiddenNavPaths.includes("/assistant") ? (
              <QuickAssistant />
            ) : null
          }
          currentModuleSubtitle={pageSubtitle}
          isPlatformOwner={isPlatformOwner}
          onOpenMobileNav={() => setMobileSidebarOpen(true)}
          roleLabel={roleLabel}
          title={pageTitle}
          userName={userName}
        />
        <DashboardPageFrame>
          <DashboardRouteTitleProvider value={{ isSectionRoot, pageTitle }}>
            {children}
          </DashboardRouteTitleProvider>
        </DashboardPageFrame>
      </div>
    </div>
  )
}
