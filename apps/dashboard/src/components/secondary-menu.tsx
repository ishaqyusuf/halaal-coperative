"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@halaalvest/ui/components/drawer"
import { cn } from "@halaalvest/ui/lib/utils"
import { Check, ChevronDown } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMobileViewport } from "@/hooks/use-mobile"

type Item = {
  label: string
  path: string
}

type Props = {
  items: readonly Item[]
}

export function getActiveSecondaryMenuItem(
  pathname: string,
  items: readonly Item[]
) {
  return (
    items
      .filter(
        (item) =>
          pathname === item.path || pathname.startsWith(`${item.path}/`)
      )
      .sort((left, right) => right.path.length - left.path.length)[0]
  )
}

export function SecondaryMenu({ items }: Props) {
  const pathname = usePathname()
  const isMobile = useMobileViewport()
  const activeItem = getActiveSecondaryMenuItem(pathname, items)

  return (
    <nav className="py-4">
      <ul className="scrollbar-hide hidden space-x-6 overflow-auto text-sm md:flex">
        {items.map((item) => (
          <Link
            className={cn(
              "text-[#606060]",
              activeItem?.path === item.path &&
                "font-medium text-primary underline underline-offset-8"
            )}
            href={item.path}
            key={item.path}
            prefetch
          >
            <span>{item.label}</span>
          </Link>
        ))}
      </ul>

      {isMobile !== false ? (
        <Drawer>
          <DrawerTrigger asChild>
            <Button
              className="flex h-11 w-full items-center justify-between md:hidden"
              type="button"
              variant="outline"
            >
              <span className="min-w-0 truncate">
                {activeItem?.label ?? "Choose section"}
              </span>
              <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
            </Button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[85dvh] md:hidden">
            <DrawerHeader className="shrink-0 border-b border-border text-left">
              <DrawerTitle>Settings section</DrawerTitle>
              <DrawerDescription>
                Choose the settings workspace you want to open.
              </DrawerDescription>
            </DrawerHeader>
            <div className="min-h-0 flex-1 divide-y divide-border overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {items.map((item) => {
                const isActive = activeItem?.path === item.path

                return (
                  <DrawerClose asChild key={item.path}>
                    <Link
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 items-center justify-between gap-3 py-3 text-sm text-foreground",
                        isActive && "font-medium text-primary"
                      )}
                      href={item.path}
                      prefetch
                    >
                      <span>{item.label}</span>
                      {isActive ? (
                        <Check aria-hidden="true" className="size-4" />
                      ) : null}
                    </Link>
                  </DrawerClose>
                )
              })}
            </div>
          </DrawerContent>
        </Drawer>
      ) : null}
    </nav>
  )
}
