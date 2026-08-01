import { HalaalvestLogo } from "@halaalvest/ui/components/brand-logo"
import { ArrowLeftIcon, ShieldCheckIcon } from "lucide-react"
import Link from "next/link"
import {
  SignupJourneyProgress,
  SignupJourneyProvider,
  type SignupJourneyStage,
} from "./signup-journey-state"

export function SignupShell({
  children,
  description,
  eyebrow,
  stage,
  title,
}: {
  children: React.ReactNode
  description: string
  eyebrow: string
  stage: SignupJourneyStage
  title: string
}) {
  return (
    <SignupJourneyProvider initialStage={stage} key={stage}>
      <main className="marketing-flow min-h-svh px-4 py-4 text-[#0B1F36] sm:px-6 sm:py-6 lg:px-8">
        <div className="mx-auto flex min-h-[calc(100svh-2rem)] w-full max-w-[96rem] flex-col overflow-hidden rounded-[1.6rem] border border-[#0B1F36]/10 bg-white shadow-[0_30px_100px_rgba(11,31,54,0.10)] sm:min-h-[calc(100svh-3rem)] lg:grid lg:grid-cols-[0.78fr_1.22fr]">
          <aside className="relative overflow-hidden bg-[#071B2C] p-6 text-white sm:p-8 lg:flex lg:min-h-[calc(100svh-3rem)] lg:flex-col lg:p-10 xl:p-12">
            <div className="marketing-dots absolute inset-0 opacity-25" />
            <div className="absolute -top-24 -right-24 size-72 rounded-full bg-[#2F9A56]/20 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 size-64 rounded-full bg-[#D6A63A]/12 blur-3xl" />

            <div className="relative">
              <Link
                className="inline-flex items-center gap-2 text-sm text-white/65 transition-colors hover:text-white"
                href="/"
              >
                <ArrowLeftIcon aria-hidden="true" className="size-4" />
                Back to Halaalvest
              </Link>

              <div className="mt-10 text-xs font-semibold tracking-[0.12em] text-[#71D98B] uppercase">
                {eyebrow}
              </div>
              <h1 className="marketing-serif mt-5 max-w-xl text-4xl leading-[1.02] tracking-[-0.035em] sm:text-5xl lg:text-6xl">
                {title}
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-white/62 sm:text-base">
                {description}
              </p>
            </div>

            <SignupJourneyProgress />

            <div className="relative mt-8 hidden items-start gap-3 border-t border-white/12 pt-6 text-xs leading-5 text-white/52 lg:flex">
              <ShieldCheckIcon
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-[#71D98B]"
              />
              <p>
                Workspace setup verifies the accountable admin before any
                cooperative records are created.
              </p>
            </div>
          </aside>

          <section className="flex min-w-0 flex-col bg-[#F8FAF8]">
            <header className="flex items-center justify-between border-b border-[#0B1F36]/9 bg-white px-5 py-4 sm:px-8">
              <Link aria-label="Halaalvest home" href="/">
                <HalaalvestLogo
                  markClassName="size-8"
                  wordmarkClassName="text-sm"
                />
              </Link>
              <p className="text-xs text-[#0B1F36]/48">
                Private cooperative setup
              </p>
            </header>

            <div className="marketing-form flex flex-1 items-start justify-center p-4 sm:p-8 lg:p-10 xl:p-12">
              <div className="w-full max-w-3xl">{children}</div>
            </div>
          </section>
        </div>
      </main>
    </SignupJourneyProvider>
  )
}
