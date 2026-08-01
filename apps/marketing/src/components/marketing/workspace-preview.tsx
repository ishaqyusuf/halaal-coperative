import {
  ArrowUpRightIcon,
  BadgeCheckIcon,
  CircleAlertIcon,
  FileCheck2Icon,
  ShieldCheckIcon,
} from "lucide-react"

const reviewItems = [
  {
    label: "Monthly contribution records",
    meta: "Ready for review",
    tone: "bg-[#E7F4EA] text-[#1F7A3D]",
  },
  {
    label: "Member documents",
    meta: "Needs attention",
    tone: "bg-[#FFF5D9] text-[#8A6200]",
  },
  {
    label: "Financing safeguards",
    meta: "Policy checked",
    tone: "bg-[#EAF0F7] text-[#0B1F36]",
  },
] as const

export function WorkspacePreview() {
  return (
    <div className="marketing-panel-shadow relative mx-auto w-full max-w-[42rem] rounded-[1.75rem] border border-[#0B1F36]/12 bg-white p-2 sm:p-3">
      <div className="overflow-hidden rounded-[1.35rem] border border-[#0B1F36]/10 bg-[#F7FAF7]">
        <div className="flex items-center justify-between border-b border-[#0B1F36]/10 bg-white px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#0B1F36] text-xs font-semibold text-white">
              AC
            </span>
            <div>
              <p className="text-sm font-semibold text-[#0B1F36]">
                Amanah Cooperative
              </p>
              <p className="text-[11px] text-[#0B1F36]/55">
                Operations overview
              </p>
            </div>
          </div>
          <span className="rounded-full border border-[#1F7A3D]/20 bg-[#E7F4EA] px-2.5 py-1 text-[10px] font-semibold text-[#1F7A3D] uppercase">
            Sample workspace
          </span>
        </div>

        <div className="grid gap-px bg-[#0B1F36]/10 sm:grid-cols-3">
          <PreviewSignal
            icon={FileCheck2Icon}
            label="Collections"
            value="Review staged records"
          />
          <PreviewSignal
            icon={ShieldCheckIcon}
            label="Financing"
            value="Liquidity before approval"
          />
          <PreviewSignal
            icon={BadgeCheckIcon}
            label="Member trust"
            value="Trace every balance"
          />
        </div>

        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.08fr_0.92fr]">
          <section className="rounded-2xl border border-[#0B1F36]/10 bg-white p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#0B1F36]">
                  Action queue
                </p>
                <p className="mt-0.5 text-xs text-[#0B1F36]/55">
                  What the finance team should review next
                </p>
              </div>
              <CircleAlertIcon
                aria-hidden="true"
                className="size-4 text-[#D6A63A]"
              />
            </div>

            <div className="mt-4 space-y-2.5">
              {reviewItems.map((item) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#0B1F36]/8 bg-[#F9FBF9] px-3 py-2.5"
                  key={item.label}
                >
                  <span className="text-xs font-medium text-[#0B1F36]">
                    {item.label}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-semibold ${item.tone}`}
                  >
                    {item.meta}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="relative overflow-hidden rounded-2xl bg-[#0B1F36] p-4 text-white">
            <div className="marketing-dots absolute inset-0 opacity-30" />
            <div className="relative">
              <p className="text-[11px] font-medium text-white/55 uppercase">
                Member statement
              </p>
              <p className="mt-2 max-w-52 text-lg leading-snug font-medium">
                Clear records make every conversation easier.
              </p>

              <div className="mt-6 space-y-3 border-t border-white/12 pt-4">
                {[
                  "Savings kept distinct",
                  "Charges explained",
                  "Repayments traceable",
                ].map((item) => (
                  <div className="flex items-center gap-2" key={item}>
                    <span className="size-1.5 rounded-full bg-[#71D98B]" />
                    <span className="text-xs text-white/75">{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between rounded-xl bg-white/8 px-3 py-2.5">
                <span className="text-xs font-medium">Open statement</span>
                <ArrowUpRightIcon
                  aria-hidden="true"
                  className="size-3.5 text-[#71D98B]"
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function PreviewSignal({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileCheck2Icon
  label: string
  value: string
}) {
  return (
    <article className="bg-white p-4">
      <div className="flex items-center gap-2 text-[#1F7A3D]">
        <Icon aria-hidden="true" className="size-3.5" />
        <p className="text-[10px] font-semibold uppercase">{label}</p>
      </div>
      <p className="mt-3 text-sm leading-snug font-medium text-[#0B1F36]">
        {value}
      </p>
    </article>
  )
}
