import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { buttonVariants } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import { DashboardThemeToggle } from "./theme-toggle"

function MenuIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      {...props}
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

function LogoutIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      {...props}
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
}

export function DashboardTopbar({
  currentModuleSubtitle,
  onOpenMobileNav,
  roleLabel,
  title,
  userName,
}: {
  currentModuleSubtitle?: string | null
  onOpenMobileNav?: () => void
  roleLabel: string
  title: string
  userName: string
}) {
  return (
    <div
      className="sticky top-0 z-30 [transform:translateY(calc(var(--header-offset,0px)*-1))] bg-background/90 backdrop-blur-xl transition-transform [transition-duration:var(--header-transition,200ms)] will-change-transform md:transform-none md:will-change-auto"
      data-dashboard-topbar
    >
      <header className="flex h-[70px] items-center gap-3 border-b border-border px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className={cn(
            buttonVariants({ size: "icon", variant: "ghost" }),
            "rounded-full md:hidden"
          )}
          aria-label="Open navigation menu"
        >
          <MenuIcon className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="hidden truncate text-xs font-medium text-muted-foreground sm:block">
            {currentModuleSubtitle ?? "Cooperative workspace"}
          </p>
          <h1 className="truncate text-xl font-semibold text-foreground sm:mt-0.5 sm:text-2xl">
            {title}
          </h1>
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          <div className="max-w-[180px] text-right">
            <p className="truncate text-xs font-medium text-foreground">
              {userName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {roleLabel}
            </p>
          </div>
        </div>
        <DashboardThemeToggle />
        <Link
          href="/auth/logout"
          className={cn(
            buttonVariants({ size: "icon", variant: "ghost" }),
            "rounded-full"
          )}
          aria-label="Logout"
          title="Logout"
        >
          <LogoutIcon className="size-5" />
        </Link>
      </header>
    </div>
  )
}
