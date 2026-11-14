"use client"

import { useState, useSyncExternalStore } from "react"
import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { HalaalvestLogo } from "@halaalvest/ui/components/brand-logo"
import { cn } from "@halaalvest/ui/lib/utils"
import type { NavModule } from "@halaalvest/site-nav"
import { Building2, ChevronDownIcon } from "lucide-react"
import { DASHBOARD_SIDEBAR_EXPANDED_WIDTH } from "./constants"
import { DashboardSidebarSheet } from "@/components/sheets/dashboard-sidebar-sheet"
import { OnboardingIcon } from "@/lib/navigation/icons"
import { getNavigationLockLabel } from "@/lib/setup-gate-routing"

// While setup is open, destinations locked until go-live are hidden rather
// than listed greyed out, and Getting started leads the list.
const setupNavSection = {
  links: [
    {
      href: "/getting-started",
      icon: OnboardingIcon,
      name: "Getting started",
      show: true,
      subLinks: [],
      title: "Getting started",
    },
  ],
  moduleName: "Setup",
  name: "setup",
  title: "Setup",
}

// Disabled stand-in for a sidebar `Link`: same frame, no navigation.
function LockedSidebarItem({
  children,
  className,
  title,
  "aria-label": ariaLabel,
}: {
  "aria-label"?: string
  children: React.ReactNode
  className?: string
  href: string
  onClick?: () => void
  title?: string
}) {
  return (
    <div
      aria-disabled="true"
      aria-label={ariaLabel}
      className={cn(className, "cursor-not-allowed")}
      role="link"
      title={title}
    >
      {children}
    </div>
  )
}

function DashboardSidebarLink({
  childrenLinks,
  onNavigate,
  expanded,
  href,
  icon: Icon,
  isActive,
  isItemExpanded,
  label,
  lockLabelFor,
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
  lockLabelFor: (href: string) => string | null
  onNavigate?: () => void
  onToggle?: () => void
  pathname: string
}) {
  const visibleChildren = childrenLinks?.filter((child) => child.show) ?? []
  const hasChildren = visibleChildren.length > 0
  // Destinations the setup gate would redirect render disabled, labelled with
  // the same predicate the layout uses (see `getNavigationLockLabel`).
  const lockLabel = lockLabelFor(href)
  const LinkFrame = lockLabel ? LockedSidebarItem : Link

  return (
    <div className="group/link">
      <div className="relative">
        <LinkFrame
          href={href}
          aria-label={lockLabel ? `${label} (${lockLabel})` : label}
          onClick={onNavigate}
          title={
            lockLabel ? `${label} · ${lockLabel}` : expanded ? undefined : label
          }
          className="block"
        >
          <div className={cn("relative", lockLabel ? "opacity-60" : null)}>
            <div
              className={cn(
                "mr-[13px] ml-[13px] h-[44px] border border-transparent transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
                isActive
                  ? "border-border bg-muted"
                  : lockLabel
                    ? "bg-transparent"
                    : "bg-transparent group-hover/link:border-border/70 group-hover/link:bg-muted/30",
                expanded ? "w-[calc(100%-26px)]" : "w-[44px]"
              )}
            />
            <div
              className={cn(
                "pointer-events-none absolute top-0 left-[13px] flex h-[44px] w-[44px] items-center justify-center transition-colors",
                isActive
                  ? "text-foreground"
                  : lockLabel
                    ? "text-muted-foreground"
                    : "text-muted-foreground group-hover/link:text-foreground"
              )}
            >
              {Icon ? <Icon className="size-[18px] shrink-0" /> : null}
            </div>
            {expanded ? (
              <div
                className={cn(
                  "pointer-events-none absolute top-0 left-[57px] flex h-[44px] items-center gap-2",
                  hasChildren ? "right-[48px]" : "right-[24px]"
                )}
              >
                <span
                  className={cn(
                    "truncate text-sm font-medium transition-colors",
                    isActive
                      ? "text-foreground"
                      : lockLabel
                        ? "text-muted-foreground"
                        : "text-muted-foreground group-hover/link:text-foreground"
                  )}
                >
                  {label}
                </span>
                {lockLabel ? (
                  <span className="ml-auto shrink-0 text-xs font-medium whitespace-nowrap text-muted-foreground">
                    {lockLabel}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </LinkFrame>
        {expanded && hasChildren ? (
          <button
            type="button"
            aria-label={
              isItemExpanded ? `Collapse ${label}` : `Expand ${label}`
            }
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onToggle?.()
            }}
            className={cn(
              "absolute top-0 right-[14px] flex size-11 items-center justify-center text-muted-foreground transition hover:text-foreground",
              isActive ? "text-foreground" : null
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

            const childLabel = child.title ?? child.name
            const childLockLabel = lockLabelFor(child.href)
            const ChildFrame = childLockLabel ? LockedSidebarItem : Link

            return (
              <ChildFrame
                key={child.href}
                aria-label={
                  childLockLabel
                    ? `${childLabel} (${childLockLabel})`
                    : undefined
                }
                href={child.href}
                onClick={onNavigate}
                title={
                  childLockLabel
                    ? `${childLabel} · ${childLockLabel}`
                    : undefined
                }
                className="group/child block"
              >
                <div
                  className={cn(
                    "mr-[13px] ml-[35px] flex min-h-11 items-center border-l border-border/70 pl-3 transition-all duration-200 ease-out",
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
                      "truncate text-sm font-medium whitespace-nowrap transition",
                      childLockLabel
                        ? "text-muted-foreground opacity-60"
                        : isChildActive
                          ? "font-semibold text-foreground group-hover/child:text-foreground"
                          : "text-muted-foreground group-hover/child:text-foreground"
                    )}
                  >
                    {childLabel}
                  </span>
                  {childLockLabel ? (
                    <span className="ml-auto shrink-0 pr-1 text-xs font-medium whitespace-nowrap text-muted-foreground">
                      {childLockLabel}
                    </span>
                  ) : null}
                </div>
              </ChildFrame>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

const WIDE_VIEWPORT_QUERY = "(min-width: 1024px)"

function subscribeToWideViewport(onChange: () => void) {
  const query = window.matchMedia(WIDE_VIEWPORT_QUERY)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

function useWideViewport() {
  return useSyncExternalStore(
    subscribeToWideViewport,
    () => window.matchMedia(WIDE_VIEWPORT_QUERY).matches,
    () => false
  )
}

export function DashboardSidebar({
  mobileOpen = false,
  modules,
  onMobileOpenChange,
  pathname,
  roleLabel,
  shouldRedirectAdminToSetup = false,
  showSetupNav = false,
  tenantName,
}: {
  mobileOpen?: boolean
  modules: NavModule[]
  onMobileOpenChange?: (open: boolean) => void
  pathname: string
  roleLabel: string
  shouldRedirectAdminToSetup?: boolean
  showSetupNav?: boolean
  tenantName: string
  /** Kept for callers; the account menu in the top bar shows the user. */
  userName?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const isWide = useWideViewport()
  const closeMobile = () => onMobileOpenChange?.(false)
  // From lg up the sidebar always shows its labels; between md and lg it stays
  // an icon rail that expands on hover so the content keeps enough width.
  const isExpanded = mobileOpen || expanded || isWide
  const lockLabelFor = (href: string) =>
    getNavigationLockLabel({ href, shouldRedirectAdminToSetup })

  const navSections = (
    <nav className="scrollbar-hide mt-4 min-h-0 w-full flex-1 overflow-x-hidden overflow-y-auto">
      <div className="flex flex-col gap-5">
        {[
          ...(showSetupNav ? [setupNavSection] : []),
          ...modules.flatMap((module) =>
            module.sections.map((section) => ({
              ...section,
              links: section.links.filter(
                (link) =>
                  link.show &&
                  link.href &&
                  (!shouldRedirectAdminToSetup || !lockLabelFor(link.href))
              ),
              moduleName: module.name,
            }))
          ),
        ]
          .filter((section) => section.links.length > 0)
          .map((section) => (
            <section key={`${section.moduleName}-${section.name}`}>
              {isExpanded ? (
                <p className="mb-2 px-[19px] text-xs font-semibold text-muted-foreground">
                  {section.title ?? section.moduleName}
                </p>
              ) : null}
              <div className="flex flex-col gap-2">
                {section.links.map((link) => {
                  const isActive =
                    pathname === link.href ||
                    pathname.startsWith(`${link.href}/`) ||
                    (link.href === "/getting-started" &&
                      pathname === "/onboarding-success")
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
                      lockLabelFor={lockLabelFor}
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
          ))}
      </div>
    </nav>
  )

  // The account menu lives in the top bar; this card names the cooperative.
  const userCard = (
    <div
      className="relative h-[44px] w-full"
      title={isExpanded ? undefined : tenantName}
    >
      <div className="absolute bottom-0 left-[13px] flex size-11 items-center justify-center rounded-(--ui-radius-control) border border-border bg-muted text-muted-foreground">
        <Building2 aria-hidden="true" className="size-5" />
      </div>
      {isExpanded ? (
        <div className="absolute right-4 bottom-0 left-[66px] flex h-[44px] min-w-0 items-center">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {tenantName}
            </p>
            <p className="truncate text-sm text-muted-foreground">
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
          <span className="hidden border-l border-border pl-2 text-xs font-medium text-muted-foreground md:inline">
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
        className="fixed top-0 left-0 z-40 hidden h-screen flex-shrink-0 overflow-hidden border-r border-border bg-background pb-4 transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] md:flex md:w-[70px] md:flex-col lg:w-[272px]"
        style={
          expanded && !isWide
            ? { width: DASHBOARD_SIDEBAR_EXPANDED_WIDTH }
            : undefined
        }
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        {sidebarBody}
      </aside>
    </>
  )
}
