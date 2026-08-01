import { HalaalvestLogo } from "@halaalvest/ui/components/brand-logo"
import { buttonVariants } from "@halaalvest/ui/components/button"
import { ArrowUpRightIcon } from "lucide-react"
import Link from "next/link"

export function MarketingHeader({ signupHref }: { signupHref: string }) {
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
          <Link
            className="transition-colors hover:text-[#0B1F36]"
            href="/#product"
          >
            Product
          </Link>
          <Link
            className="transition-colors hover:text-[#0B1F36]"
            href="/#workflow"
          >
            How it works
          </Link>
          <Link
            className="transition-colors hover:text-[#0B1F36]"
            href="/#migration"
          >
            Migration
          </Link>
          <Link
            className="transition-colors hover:text-[#0B1F36]"
            href="/pricing"
          >
            Pricing
          </Link>
          <Link
            className="transition-colors hover:text-[#0B1F36]"
            href="/#trust"
          >
            Trust
          </Link>
        </nav>

        <Link
          className={buttonVariants({
            className:
              "h-10 rounded-full !bg-[#0B1F36] px-4 text-sm !text-white shadow-none hover:!bg-[#123455] sm:px-5",
          })}
          href={signupHref}
        >
          <span className="hidden sm:inline">Request guided setup</span>
          <span className="sm:hidden">Get started</span>
          <ArrowUpRightIcon aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </header>
  )
}
