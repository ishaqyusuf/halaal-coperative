import Link from "next/link"
import { Badge } from "@halaal-vest/ui/components/badge"
import { buttonVariants } from "@halaal-vest/ui/components/button"
import { cn } from "@halaal-vest/ui/lib/utils"
import { DashboardThemeToggle } from "./dashboard-theme-toggle"

export function DashboardTopbar({
  currentModuleSubtitle,
  onOpenMobileNav,
  quickLinks,
  roleLabel,
  title,
  userName,
}: {
  currentModuleSubtitle?: string | null
  onOpenMobileNav?: () => void
  quickLinks: Array<{ href?: string; title?: string; name: string }>
  roleLabel: string
  title: string
  userName: string
}) {
  return (
    <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl">
      <header className="flex min-h-[72px] items-center gap-4 border-b border-border/70 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className={cn(buttonVariants({ size: "sm", variant: "outline" }), "rounded-full md:hidden")}
          aria-label="Open navigation menu"
        >
          Menu
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            {currentModuleSubtitle ?? "Cooperative workspace"}
          </p>
          <h1 className="mt-1 truncate text-[26px] font-semibold tracking-[-0.04em] text-foreground">
            {title}
          </h1>
        </div>
        <DashboardThemeToggle />
        <div className="hidden items-center gap-2 lg:flex">
          <Badge variant="outline" className="rounded-full px-3 py-1">
            {roleLabel}
          </Badge>
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            {userName}
          </Badge>
          <Link href="/auth/logout" className={cn(buttonVariants({ size: "sm", variant: "outline" }), "rounded-full")}>
            Logout
          </Link>
        </div>
      </header>

      <div className="border-b border-border/70 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex gap-2 overflow-x-auto">
          {quickLinks.map((link) =>
            link.href ? (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
              >
                {link.title ?? link.name}
              </Link>
            ) : null,
          )}
        </div>
      </div>
    </div>
  )
}
