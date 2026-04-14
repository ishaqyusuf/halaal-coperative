"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Badge } from "@halaal-vest/ui/components/badge"
import { getDashboardQuickLinks, getDashboardRouteTitle } from "@/features/navigation/lib"
import type { CooperativeRole } from "@halaal-vest/auth"

function DashboardSidebar({
  modules,
  pathname,
  tenantName,
}: {
  modules: ReturnType<typeof getDashboardRouteTitle>["modules"]
  pathname: string
  tenantName: string
}) {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-border/70 bg-background/92 px-4 py-6 lg:flex lg:flex-col">
      <div className="px-2">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
          Halaal-Vest
        </p>
        <h2 className="mt-3 text-xl font-semibold tracking-tight text-foreground">{tenantName}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Role-aware cooperative workspace navigation inspired by the GND site-nav registry pattern.
        </p>
      </div>

      <nav className="mt-8 flex-1 space-y-6 overflow-y-auto pr-1">
        {modules.map((module) => (
          <div key={module.key} className="space-y-3">
            <div className="px-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
                {module.title}
              </p>
              {module.subtitle ? (
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{module.subtitle}</p>
              ) : null}
            </div>

            <div className="space-y-4">
              {module.sections.map((section) => (
                <div key={section.key} className="space-y-1">
                  {section.title ? (
                    <p className="px-2 text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
                      {section.title}
                    </p>
                  ) : null}
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const active = pathname === item.href || pathname.startsWith(`${item.href}/`)

                      return (
                        <Link
                          key={item.key}
                          href={item.href}
                          className={`flex items-center justify-between rounded-2xl px-3 py-2 text-sm transition ${
                            active
                              ? "bg-emerald-900 text-white shadow-sm"
                              : "text-foreground hover:bg-muted/70"
                          }`}
                        >
                          <span>{item.title}</span>
                          {item.status === "upcoming" ? (
                            <span className={`text-[0.625rem] uppercase tracking-[0.16em] ${active ? "text-emerald-100" : "text-muted-foreground"}`}>
                              Soon
                            </span>
                          ) : null}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}

function DashboardHeader({
  activeTitle,
  quickLinks,
  roleLabel,
  userName,
}: {
  activeTitle: string
  quickLinks: ReturnType<typeof getDashboardQuickLinks>
  roleLabel: string
  userName: string
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/92 backdrop-blur">
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Cooperative Workspace
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{activeTitle}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{roleLabel}</Badge>
            <Badge variant="secondary">{userName}</Badge>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {quickLinks.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted whitespace-nowrap"
            >
              {link.title}
            </Link>
          ))}
        </div>
      </div>
    </header>
  )
}

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
  const { activeItem, modules, roleLabel } = getDashboardRouteTitle(pathname, role)
  const quickLinks = getDashboardQuickLinks(pathname, modules)

  return (
    <div className="min-h-svh bg-[radial-gradient(circle_at_top,_rgba(218,119,38,0.10),_transparent_30%),linear-gradient(180deg,_rgba(255,248,239,0.98)_0%,_rgba(255,255,255,1)_38%,_rgba(248,244,237,1)_100%)] lg:flex">
      <DashboardSidebar modules={modules} pathname={pathname} tenantName={tenantName} />
      <div className="min-w-0 flex-1">
        <DashboardHeader
          activeTitle={activeItem?.title ?? "Dashboard"}
          quickLinks={quickLinks}
          roleLabel={roleLabel}
          userName={userName}
        />
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
