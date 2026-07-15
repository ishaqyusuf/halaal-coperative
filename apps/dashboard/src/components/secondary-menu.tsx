"use client"

import { cn } from "@halaalvest/ui/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"

type Item = {
  label: string
  path: string
}

type Props = {
  items: readonly Item[]
}

export function SecondaryMenu({ items }: Props) {
  const pathname = usePathname()

  return (
    <nav className="py-4">
      <ul className="scrollbar-hide flex space-x-6 overflow-auto text-sm">
        {items.map((item) => (
          <Link
            className={cn(
              "text-[#606060]",
              (pathname === item.path ||
                pathname.startsWith(`${item.path}/`)) &&
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
    </nav>
  )
}
