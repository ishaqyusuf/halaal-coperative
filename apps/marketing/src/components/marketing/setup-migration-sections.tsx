import {
  ArrowRightIcon,
  BookOpenCheckIcon,
  FileClockIcon,
  FileSpreadsheetIcon,
} from "lucide-react"
import Link from "next/link"

const setupSteps = [
  {
    number: "01",
    title: "Understand the current records",
    body: "Start with the cooperative size, current record system, operating needs, and target setup window.",
  },
  {
    number: "02",
    title: "Create the cooperative workspace",
    body: "Reserve the workspace address, verify the accountable admin, and save the cooperative profile.",
  },
  {
    number: "03",
    title: "Bring forward trusted history",
    body: "Import members or stage opening positions with source documents, review, and approval evidence.",
  },
  {
    number: "04",
    title: "Prepare the first live month",
    body: "Configure shares, charges, financing policy, collection sources, and monthly commitments before operating live.",
  },
] as const

const migrationRoutes = [
  {
    icon: FileSpreadsheetIcon,
    title: "Member import",
    body: "Move member profiles from structured files into a reviewable registry.",
  },
  {
    icon: FileClockIcon,
    title: "Historical backfill",
    body: "Preserve detailed dated records when the cooperative has reliable history.",
  },
  {
    icon: BookOpenCheckIcon,
    title: "Opening positions",
    body: "Bring forward current balances and obligations when full history is impractical.",
  },
] as const

export function SetupMigrationSections({ signupHref }: { signupHref: string }) {
  return (
    <>
      <section
        id="workflow"
        className="scroll-mt-24 border-y border-[#0B1F36]/10 bg-white px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-32"
      >
        <div className="mx-auto grid w-full max-w-[90rem] gap-14 lg:grid-cols-[0.76fr_1.24fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <div className="marketing-eyebrow">How setup works</div>
            <h2 className="marketing-serif mt-7 text-4xl leading-[1.04] tracking-[-0.035em] sm:text-5xl">
              From current records to a confident first live month.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#0B1F36]/62">
              Guided setup keeps profile creation light, then moves the detailed
              financial and migration work into the protected cooperative
              workspace.
            </p>
            <Link
              className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#1F7A3D] hover:text-[#176331]"
              href={signupHref}
            >
              Start the guided path
              <ArrowRightIcon aria-hidden="true" className="size-4" />
            </Link>
          </div>

          <div className="border-t border-[#0B1F36]/12">
            {setupSteps.map((step) => (
              <article
                className="grid gap-4 border-b border-[#0B1F36]/12 py-7 sm:grid-cols-[5rem_1fr] sm:py-9"
                key={step.number}
              >
                <p className="text-sm font-semibold text-[#1F7A3D]">
                  {step.number}
                </p>
                <div>
                  <h3 className="text-xl font-semibold tracking-[-0.02em] sm:text-2xl">
                    {step.title}
                  </h3>
                  <p className="mt-3 max-w-2xl leading-7 text-[#0B1F36]/60">
                    {step.body}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="migration"
        className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-32"
      >
        <div className="mx-auto w-full max-w-[90rem] overflow-hidden rounded-[1.75rem] bg-[#E8F3EA]">
          <div className="grid lg:grid-cols-[0.84fr_1.16fr]">
            <div className="relative overflow-hidden border-b border-[#0B1F36]/10 p-7 sm:p-10 lg:border-r lg:border-b-0 lg:p-14">
              <div className="marketing-dots absolute inset-0 opacity-35" />
              <div className="relative">
                <div className="marketing-eyebrow">
                  Migration without guesswork
                </div>
                <h2 className="marketing-serif mt-7 max-w-xl text-4xl leading-[1.02] tracking-[-0.035em] sm:text-5xl">
                  Respect the books your cooperative already has.
                </h2>
                <p className="mt-5 max-w-xl text-lg leading-8 text-[#0B1F36]/62">
                  Detailed history when it is trustworthy. Reviewed opening
                  positions when it is not. Both paths preserve source evidence
                  and keep posted history from being silently rewritten.
                </p>
              </div>
            </div>

            <div className="grid gap-px bg-[#0B1F36]/10 sm:grid-cols-3">
              {migrationRoutes.map(({ body, icon: Icon, title }) => (
                <article
                  className="bg-[#F4F9F4] p-6 sm:p-7 lg:min-h-80"
                  key={title}
                >
                  <Icon aria-hidden="true" className="size-6 text-[#1F7A3D]" />
                  <h3 className="mt-20 text-xl font-semibold tracking-[-0.02em] lg:mt-32">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[#0B1F36]/60">
                    {body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
