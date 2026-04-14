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
      className={cn(
        "group flex items-center rounded-2xl px-3 py-2.5 text-sm transition",
        isActive
          ? "bg-foreground text-background shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        expanded ? "gap-3 justify-start" : "justify-center",
      )}
    >
      {Icon ? <Icon className="size-[18px] shrink-0" /> : null}
      <span className={cn("truncate", expanded ? "opacity-100" : "sr-only")}>{label}</span>
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
    <nav className="space-y-6 overflow-y-auto">
      {modules.map((module) => (
        <section key={module.name}>
          {isExpanded ? (
            <div className="mb-2 px-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {module.name}
              </p>
              {module.subtitle ? <p className="mt-1 text-xs text-muted-foreground">{module.subtitle}</p> : null}
            </div>
          ) : null}
          <div className="space-y-1">
            {module.sections.flatMap((section) =>
              section.links
                .filter((link) => link.show && link.href)
                .map((link) => (
                  <DashboardSidebarLink
                    key={link.href}
                    expanded={isExpanded}
                    href={link.href!}
                    icon={link.icon}
                    isActive={pathname === link.href || pathname.startsWith(`${link.href}/`)}
                    label={link.title ?? link.name}
                    onNavigate={mobileOpen ? closeMobile : undefined}
                  />
                )),
            )}
          </div>
        </section>
      ))}
    </nav>
  )

  const userCard = (
    <div className="rounded-[22px] border border-border/70 bg-muted/30 p-3">
      <div className={cn("flex items-center", isExpanded ? "gap-3" : "justify-center")}>
        <div className="flex size-9 items-center justify-center rounded-full bg-card text-xs font-semibold text-foreground">
          {userName
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </div>
        {isExpanded ? (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{userName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {currentModuleName ?? "Workspace"} · {roleLabel}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )

  const brand = (
    <div className="flex h-[72px] items-center border-b border-border/70 px-5">
      <div className={cn("flex min-w-0 items-center", isExpanded ? "gap-3" : "w-full justify-center")}>
        <div className="flex size-10 items-center justify-center rounded-2xl bg-foreground text-sm font-semibold text-background">
          HV
        </div>
        {isExpanded ? (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-[-0.02em] text-foreground">Halaal Vest</p>
            <p className="truncate text-xs text-muted-foreground">{tenantName}</p>
          </div>
        ) : null}
      </div>
    </div>
  )

  const sidebarBody = (
    <>
      {brand}

      <div className="flex min-h-0 flex-1 flex-col justify-between px-3 py-4">
        {navSections}
        {userCard}
      </div>
    </>
  )

  return (
    <>
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            aria-label="Close navigation menu"
            onClick={closeMobile}
          />
          <aside
            className="absolute inset-y-0 left-0 flex max-w-[calc(100vw-2rem)] flex-col border-r border-border/70 bg-background shadow-xl"
            style={{ width: DASHBOARD_MOBILE_SIDEBAR_WIDTH }}
          >
            {sidebarBody}
          </aside>
        </div>
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-border/70 bg-background transition-[width] duration-200 ease-out md:flex md:flex-col",
        )}
        style={{ width: expanded ? DASHBOARD_SIDEBAR_EXPANDED_WIDTH : DASHBOARD_SIDEBAR_COLLAPSED_WIDTH }}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        {sidebarBody}
      </aside>
    </>
  )
}
