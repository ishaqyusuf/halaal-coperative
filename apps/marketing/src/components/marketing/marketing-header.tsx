import { HalaalvestLogo } from "@halaalvest/ui/components/brand-logo"
import { buttonVariants } from "@halaalvest/ui/components/button"
import { ArrowUpRightIcon } from "lucide-react"
import Link from "next/link"

const links = [
  ["/#product", "Product"],
  ["/#how-it-works", "How it works"],
  ["/pricing", "Pricing"],
] as const

export function MarketingHeader({
  ctaLabel,
  signupHref,
}: {
  ctaLabel: string
  signupHref: string
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-[#0B1F36]/10 bg-[#F7FAF7]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-17 w-full max-w-[90rem] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link
          aria-label="Halaalvest home"
          className="transition-opacity hover:opacity-75"
          href="/"
        >
          <HalaalvestLogo
            markClassName="size-9"
            wordmarkClassName="text-base"
          />
        </Link>

        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-7 text-sm text-[#0B1F36]/70 lg:flex"
        >
          {links.map(([href, label]) => (
            <Link
              className="transition-colors hover:text-[#0B1F36]"
              href={href}
              key={href}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-3">
          <Link
            className="inline-flex min-h-10 items-center rounded-full px-3 text-sm font-medium text-[#0B1F36]/80 transition-colors hover:text-[#0B1F36]"
            href="/login"
          >
            Sign in
          </Link>
          <Link
            className={buttonVariants({
              className:
                "h-10 rounded-full !bg-[#0B1F36] px-4 text-sm !text-white shadow-none hover:!bg-[#123455] sm:px-5",
            })}
            href={signupHref}
          >
            <span className="hidden sm:inline">{ctaLabel}</span>
            <span className="sm:hidden">Get started</span>
            <ArrowUpRightIcon aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </div>
    </header>
  )
}
