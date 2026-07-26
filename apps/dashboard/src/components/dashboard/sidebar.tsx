"use client"

import { useState } from "react"
import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { HalaalvestLogo } from "@halaalvest/ui/components/brand-logo"
import { cn } from "@halaalvest/ui/lib/utils"
import type { NavModule } from "@halaalvest/site-nav"
import { ChevronDownIcon } from "lucide-react"
import {
  DASHBOARD_SIDEBAR_COLLAPSED_WIDTH,
  DASHBOARD_SIDEBAR_EXPANDED_WIDTH,
} from "./constants"
import { DashboardSidebarSheet } from "@/components/sheets/dashboard-sidebar-sheet"

function DashboardSidebarLink({
  childrenLinks,
  onNavigate,
  expanded,
  href,
  icon: Icon,
  isActive,
  isItemExpanded,
  label,
  onToggle,
  pathname,
}: {
  childrenLinks?: Array<{
    href?: string
    name: string
    show?: boolean
    title?: string
  }>
  expanded: boolean
  href: string
  icon?: NavModule["icon"]
  isActive: boolean
  isItemExpanded?: boolean
  label: string
  onNavigate?: () => void
  onToggle?: () => void
  pathname: string
}) {
  const visibleChildren = childrenLinks?.filter((child) => child.show) ?? []
  const hasChildren = visibleChildren.length > 0

  return (
    <div className="group/link">
      <div className="relative">
        <Link
          href={href}
          aria-label={label}
          onClick={onNavigate}
          title={expanded ? undefined : label}
          className="block"
        >
          <div className="relative">
            <div
              className={cn(
                "mr-[15px] ml-[15px] h-[40px] border border-transparent transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
                isActive
                  ? "border-border bg-[#f7f7f7] dark:bg-[#131313]"
                  : "bg-transparent group-hover/link:border-border/70 group-hover/link:bg-muted/30",
                expanded ? "w-[calc(100%-30px)]" : "w-[40px]"
              )}
            />
            <div
              className={cn(
                "pointer-events-none absolute top-0 left-[15px] flex h-[40px] w-[40px] items-center justify-center transition-colors",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground group-hover/link:text-foreground"
              )}
            >
              {Icon ? <Icon className="size-[18px] shrink-0" /> : null}
            </div>
            {expanded ? (
              <div className="pointer-events-none absolute top-0 right-[48px] left-[55px] flex h-[40px] items-center">
                <span
                  className={cn(
                    "truncate text-sm font-medium transition-colors",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground group-hover/link:text-foreground"
                  )}
                >
                  {label}
                </span>
              </div>
            ) : null}
          </div>
        </Link>
        {expanded && hasChildren ? (
          <button
            type="button"
            aria-label={isItemExpanded ? `Collapse ${label}` : `Expand ${label}`}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onToggle?.()
            }}
            className={cn(
              "absolute top-1 right-[18px] flex size-8 items-center justify-center text-muted-foreground transition hover:text-foreground",
              isActive ? "text-foreground/70" : null
            )}
          >
            <ChevronDownIcon
              className={cn(
                "size-4 transition-transform duration-200",
                isItemExpanded ? "rotate-180" : null
              )}
            />
          </button>
        ) : null}
      </div>
      {expanded && hasChildren ? (
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-out",
            isItemExpanded ? "mt-1 max-h-96" : "max-h-0"
          )}
        >
          {visibleChildren.map((child, index) => {
            const isChildActive =
              child.href === pathname ||
              (child.href ? pathname.startsWith(`${child.href}/`) : false)

            if (!child.href) {
              return null
            }

            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                className="group/child block"
              >
                <div
                  className={cn(
                    "mr-[15px] ml-[35px] flex h-[32px] items-center border-l border-border/70 pl-3 transition-all duration-200 ease-out",
                    isItemExpanded
                      ? "translate-x-0 opacity-100"
                      : "-translate-x-2 opacity-0"
                  )}
                  style={{
                    transitionDelay: isItemExpanded
                      ? `${40 + index * 20}ms`
                      : `${index * 20}ms`,
                  }}
                >
                  <span
                    className={cn(
                      "truncate text-xs font-medium whitespace-nowrap transition group-hover/child:text-foreground",
                      isChildActive ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {child.title ?? child.name}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export function DashboardSidebar({
  mobileOpen = false,
  modules,
  onMobileOpenChange,
  pathname,
  roleLabel,
  tenantName,
  userName,
}: {
  mobileOpen?: boolean
  modules: NavModule[]
  onMobileOpenChange?: (open: boolean) => void
  pathname: string
  roleLabel: string
  tenantName: string
  userName: string
}) {
  const [expanded, setExpanded] = useState(false)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const closeMobile = () => onMobileOpenChange?.(false)
  const isExpanded = mobileOpen || expanded

  const navSections = (
    <nav className="scrollbar-hide mt-4 min-h-0 w-full flex-1 overflow-x-hidden overflow-y-auto">
      <div className="flex flex-col gap-5">
        {modules.flatMap((module) =>
          module.sections
            .map((section) => ({
              ...section,
              links: section.links.filter((link) => link.show && link.href),
              moduleName: module.name,
            }))
            .filter((section) => section.links.length > 0)
            .map((section) => (
              <section key={`${section.moduleName}-${section.name}`}>
                {isExpanded ? (
                  <p className="mb-2 px-[19px] text-[10px] font-semibold text-muted-foreground/60 uppercase">
                    {section.title ?? section.moduleName}
                  </p>
                ) : null}
                <div className="flex flex-col gap-2">
                  {section.links.map((link) => {
                    const isActive =
                      pathname === link.href ||
                      pathname.startsWith(`${link.href}/`)
                    const isItemExpanded =
                      expandedItem === link.href ||
                      (isActive && Boolean(link.subLinks?.length))

                    return (
                      <DashboardSidebarLink
                        key={link.href}
                        childrenLinks={link.subLinks}
                        expanded={isExpanded}
                        href={link.href!}
                        icon={link.icon}
                        isActive={isActive}
                        isItemExpanded={isItemExpanded}
                        label={link.title ?? link.name}
                        onNavigate={mobileOpen ? closeMobile : undefined}
                        onToggle={() =>
                          setExpandedItem((current) =>
                            current === link.href ? null : (link.href ?? null)
                          )
                        }
                        pathname={pathname}
                      />
                    )
                  })}
                </div>
              </section>
            ))
        )}
      </div>
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
            <p className="truncate text-sm leading-none font-medium text-foreground">
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
      <Link
        href="/"
        aria-label="Halaalvest home"
        className="absolute left-[18px] flex items-center gap-2 overflow-hidden"
      >
        <HalaalvestLogo
          showWordmark={isExpanded}
          markClassName="size-9"
          wordmarkClassName="text-base"
        />
        {isExpanded ? (
          <span className="border-l border-border pl-2 text-[11px] font-medium text-muted-foreground uppercase">
            Dashboard
          </span>
        ) : null}
      </Link>
    </div>
  )

  const sidebarBody = (
    <>
      {brand}

      <div className="mb-3 flex min-h-0 flex-1 flex-col justify-between border-b border-border px-0 pt-[70px] pb-3">
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
        className="fixed top-0 left-0 z-40 hidden h-screen flex-shrink-0 overflow-hidden border-r border-border bg-background pb-4 transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] md:flex md:flex-col"
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
