import {
  HalaalvestLogo,
  HalaalvestLogoMark,
} from "@halaalvest/ui/components/brand-logo"
import { ArrowLeftIcon, ShieldCheckIcon } from "lucide-react"
import Link from "next/link"
import {
  SignupJourneyMobileBar,
  SignupJourneyProgress,
  SignupJourneyProvider,
  type SignupJourneyStage,
} from "./signup-journey-state"

// One Path page shell for steps 1–4: the journey rail on the left from `md`,
// a compact progress bar with an "All steps" sheet below it. The heading props
// are only for standalone states (invalid or used links); step forms render
// their own heading inside JourneyStep.
export function SignupShell({
  children,
  description,
  eyebrow,
  stage,
  title,
}: {
  children: React.ReactNode
  description?: string
  eyebrow?: string
  stage: SignupJourneyStage
  title?: string
}) {
  return (
    <SignupJourneyProvider initialStage={stage} key={stage}>
      <main className="marketing-flow min-h-svh text-[#0B1F36] md:grid md:grid-cols-[18rem_minmax(0,1fr)] lg:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="relative hidden bg-[#071B2C] text-white md:block">
          <div className="sticky top-0 flex max-h-svh min-h-svh flex-col gap-8 overflow-y-auto px-6 py-7">
            <div>
              <Link
                aria-label="Halaalvest home"
                className="inline-flex items-center gap-2.5 font-semibold tracking-[-0.01em]"
                href="/"
              >
                <HalaalvestLogoMark
                  aria-hidden="true"
                  className="size-7"
                  scheme="dark"
                />
                <span className="text-sm">
                  Halaal<span className="text-[#71D98B]">vest</span>
                </span>
              </Link>
              <Link
                className="mt-3 flex min-h-9 items-center gap-2 text-xs text-white/60 transition-colors hover:text-white"
                href="/"
              >
                <ArrowLeftIcon aria-hidden="true" className="size-3.5" />
                Back to Halaalvest
              </Link>
            </div>

            <SignupJourneyProgress />

            <div className="mt-auto flex items-start gap-3 border-t border-white/12 pt-4 text-xs leading-5 text-white/52">
              <ShieldCheckIcon
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-[#71D98B]"
              />
              <p>
                Nothing is created until the admin&apos;s email is verified.
                After that, progress is saved after each step.
              </p>
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-col">
          <header className="flex items-center justify-between border-b border-[#0B1F36]/9 bg-white px-4 py-3 md:hidden">
            <Link aria-label="Halaalvest home" href="/">
              <HalaalvestLogo
                markClassName="size-7"
                wordmarkClassName="text-sm"
              />
            </Link>
            <p className="text-xs text-[#0B1F36]/48">Cooperative setup</p>
          </header>
          <SignupJourneyMobileBar />

          <div className="marketing-form flex flex-1 justify-center px-4 pt-6 pb-0 sm:px-8 sm:pt-10 lg:px-10 lg:pt-12">
            <div className="flex w-full max-w-3xl flex-col pb-6">
              {title ? (
                <div className="mb-6">
                  {eyebrow ? (
                    <p className="text-xs font-semibold tracking-[0.08em] text-[#1F7A3D] uppercase">
                      {eyebrow}
                    </p>
                  ) : null}
                  <h1 className="marketing-serif mt-2 text-[1.75rem] leading-[1.12] tracking-[-0.02em] text-balance sm:text-[2.125rem]">
                    {title}
                  </h1>
                  {description ? (
                    <p className="mt-2.5 max-w-[34em] text-[15px] leading-6 text-[#5A6878]">
                      {description}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {children}
            </div>
          </div>
        </section>
      </main>
    </SignupJourneyProvider>
  )
}
