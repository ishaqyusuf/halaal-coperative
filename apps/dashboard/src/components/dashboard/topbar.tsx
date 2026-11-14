import { buttonVariants } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import { Menu } from "lucide-react"
import { DashboardUserMenu } from "./user-menu"

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
      <header className="flex h-[70px] items-center gap-2 border-b border-border px-4 sm:gap-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className={cn(
            buttonVariants({ size: "icon", variant: "ghost" }),
            "size-11 rounded-full md:hidden"
          )}
          aria-label="Open menu"
        >
          <Menu aria-hidden="true" className="size-6" />
        </button>
        <div className="min-w-0 flex-1">
          {currentModuleSubtitle ? (
            <p className="hidden truncate text-sm text-muted-foreground sm:block">
              {currentModuleSubtitle}
            </p>
          ) : null}
          <h1 className="truncate font-[family-name:var(--font-display)] text-xl font-semibold text-foreground sm:text-2xl">
            {title}
          </h1>
        </div>
        <DashboardUserMenu roleLabel={roleLabel} userName={userName} />
      </header>
    </div>
  )
}
