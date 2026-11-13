import { HalaalvestLogo } from "@halaalvest/ui/components/brand-logo"
import { ArrowLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { WorkspaceSignInForm } from "@/components/workspace-sign-in-form"
import { getMarketingConfig } from "@/lib/marketing-config"
import { getSignupHref } from "@/lib/runtime-url"
import { getWorkspaceUrlSuffix } from "@/lib/workspace-url-suffix"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Sign in | Halaalvest",
  description:
    "Find your cooperative's workspace and sign in with your member code or email.",
}

// Each cooperative signs in on its own host (<slug>.halaalvest.com). This page
// only finds that host; the password is never entered here.
export default async function LoginPage() {
  const marketing = getMarketingConfig()
  const signupHref = marketing.earlyAccessModeEnabled
    ? "/#early-access"
    : await getSignupHref()

  return (
    <main className="marketing-flow flex min-h-svh flex-col bg-[#F7FAF7] text-[#0B1F36]">
      <header className="border-b border-[#0B1F36]/10 bg-white">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link aria-label="Halaalvest home" href="/">
            <HalaalvestLogo
              markClassName="size-8"
              wordmarkClassName="text-base"
            />
          </Link>
          <Link
            className="inline-flex min-h-10 items-center gap-2 text-sm text-[#0B1F36]/70 transition-colors hover:text-[#0B1F36]"
            href="/"
          >
            <ArrowLeftIcon aria-hidden="true" className="size-4" />
            Back to Halaalvest
          </Link>
        </div>
      </header>

      <div className="marketing-form flex flex-1 justify-center px-4 py-10 sm:px-6 sm:py-16">
        <div className="w-full max-w-xl">
          <p className="text-xs font-semibold tracking-[0.08em] text-[#1F7A3D] uppercase">
            Sign in
          </p>
          <h1 className="marketing-serif mt-2 text-[2rem] leading-[1.1] tracking-[-0.02em] text-balance sm:text-[2.5rem]">
            Find your cooperative
          </h1>
          <p className="mt-3 max-w-[34em] text-base leading-7 text-[#5A6878]">
            Every cooperative has its own sign-in page. Tell us its workspace
            address or your member code and we&apos;ll take you there.
          </p>

          <div className="mt-8 rounded-2xl border border-[#0B1F36]/10 bg-white p-5 shadow-[0_1px_0_rgb(11_31_54/4%)] sm:p-7">
            <WorkspaceSignInForm workspaceUrlSuffix={getWorkspaceUrlSuffix()} />
          </div>

          <p className="mt-6 text-[15px] leading-6 text-[#5A6878]">
            Setting up a new cooperative?{" "}
            <Link
              className="font-semibold text-[#1F7A3D] underline-offset-4 hover:underline"
              href={signupHref}
            >
              {marketing.earlyAccessModeEnabled ? "Request access" : "Sign up"}
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
