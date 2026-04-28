"use client"

import Link from "next/link"
import { useState } from "react"
import { cn } from "@halaal-vest/ui/lib/utils"
import type { NavModule } from "@halaal-vest/site-nav"
import {
  DASHBOARD_MOBILE_SIDEBAR_WIDTH,
  DASHBOARD_SIDEBAR_COLLAPSED_WIDTH,
  DASHBOARD_SIDEBAR_EXPANDED_WIDTH,
} from "./constants"
import { DashboardSidebarSheet } from "@/components/sheets/dashboard-sidebar-sheet"

function DashboardSidebarLink({
  onNavigate,
  expanded,
  href,
  icon: Icon,
  isActive,
  label,
}: {
  expanded: boolean
  href: string
  icon?: NavModule["icon"]
  isActive: boolean
  label: string
  onNavigate?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={expanded ? undefined : label}
      className="group block"
    >
      <div className="relative">
        <div
          className={cn(
            "ml-[15px] mr-[15px] h-[40px] border border-transparent transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
            isActive
              ? "border-border bg-[#f7f7f7] dark:bg-[#131313]"
              : "bg-transparent group-hover:border-border/70 group-hover:bg-muted/30",
            expanded ? "w-[calc(100%-30px)]" : "w-[40px]"
          )}
        />
        <div
          className={cn(
            "pointer-events-none absolute top-0 left-[15px] flex h-[40px] w-[40px] items-center justify-center transition-colors",
            isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
          )}
        >
          {Icon ? <Icon className="size-[18px] shrink-0" /> : null}
        </div>
        {expanded ? (
          <div className="pointer-events-none absolute top-0 left-[55px] right-[16px] flex h-[40px] items-center">
            <span
              className={cn(
                "truncate text-sm font-medium transition-colors",
                isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
              )}
            >
              {label}
            </span>
          </div>
        ) : null}
      </div>
    </Link>
  )
}

export function DashboardSidebar({
  currentModuleName,
  mobileOpen = false,
  modules,
  onMobileOpenChange,
  pathname,
  roleLabel,
  tenantName,
  userName,
}: {
  currentModuleName?: string | null
  mobileOpen?: boolean
  modules: NavModule[]
  onMobileOpenChange?: (open: boolean) => void
  pathname: string
  roleLabel: string
  tenantName: string
  userName: string
}) {
  const [expanded, setExpanded] = useState(false)
  const closeMobile = () => onMobileOpenChange?.(false)
  const isExpanded = mobileOpen || expanded

  const navSections = (
    <nav className="mt-4 w-full overflow-y-auto">
      {modules.map((module) => (
        <section key={module.name} className="mb-4">
          <div className="flex flex-col gap-2">
            {module.sections.flatMap((section) =>
              section.links
                .filter((link) => link.show && link.href)
                .map((link) => (
                  <DashboardSidebarLink
                    key={link.href}
                    expanded={isExpanded}
                    href={link.href!}
                    icon={link.icon}
                    isActive={
                      pathname === link.href ||
                      pathname.startsWith(`${link.href}/`)
                    }
                    label={link.title ?? link.name}
                    onNavigate={mobileOpen ? closeMobile : undefined}
                  />
                ))
            )}
          </div>
        </section>
      ))}
    </nav>
  )

  const userCard = (
    <div className="relative h-[36px] w-full">
      <div className="absolute bottom-0 left-[19px] flex h-[32px] w-[32px] items-center justify-center border border-border/70 bg-background text-[11px] font-semibold text-foreground">
          {userName
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
      </div>
      {isExpanded ? (
        <div className="absolute right-4 bottom-0 left-[62px] flex h-[32px] min-w-0 items-center">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium leading-none text-foreground">
              {tenantName}
            </p>
            <p className="mt-1 truncate text-[11px] leading-none text-muted-foreground">
              {roleLabel}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )

  const brand = (
    <div
      className={cn(
        "absolute top-0 left-0 flex h-[70px] items-center border-b border-border bg-background transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
        isExpanded ? "w-full" : "w-[69px]"
      )}
    >
      <Link href="/" className="absolute left-[20px] flex items-center">
        <div className="flex size-7 items-center justify-center text-sm font-semibold tracking-[-0.04em] text-foreground">
          HV
        </div>
      </Link>
      {isExpanded ? (
        <div className="absolute left-[54px] right-4 min-w-0">
            <p className="truncate text-sm font-semibold tracking-[-0.02em] leading-none text-foreground">
              Halaal Vest
            </p>
            <p className="mt-1 truncate text-[11px] leading-none text-muted-foreground">
              {currentModuleName ?? tenantName}
            </p>
        </div>
      ) : null}
    </div>
  )

  const sidebarBody = (
    <>
      {brand}

      <div className="mb-3 flex min-h-0 flex-1 flex-col justify-between border-b border-border px-0 pb-3 pt-[70px]">
        {navSections}
      </div>
      <div className="w-full px-0">{userCard}</div>
    </>
  )

  return (
    <>
      <DashboardSidebarSheet onOpenChange={closeMobile} open={mobileOpen}>
        {sidebarBody}
      </DashboardSidebarSheet>

      <aside
        className="fixed top-0 left-0 z-40 hidden h-screen flex-shrink-0 border-r border-border bg-background pb-4 transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] md:flex md:flex-col"
        style={{
          width: expanded
            ? DASHBOARD_SIDEBAR_EXPANDED_WIDTH
            : DASHBOARD_SIDEBAR_COLLAPSED_WIDTH,
        }}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        {sidebarBody}
      </aside>
    </>
  )
}
