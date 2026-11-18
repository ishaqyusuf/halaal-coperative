import Link from "next/link"

export function MarketingFooter({
  signupLink: [signupHref, signupLabel],
}: {
  signupLink: readonly [href: string, label: string]
}) {
  return (
    <footer className="border-t border-[#0B1F36]/10 bg-white px-5 py-8 sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-5 text-sm text-[#0B1F36]/58 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-[#0B1F36]">Halaalvest</p>
          <p className="mt-1">
            The trusted operating system for cooperative finance.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Link className="hover:text-[#0B1F36]" href="/#product">
            Product
          </Link>
          <Link className="hover:text-[#0B1F36]" href="/pricing">
            Pricing
          </Link>
          <Link className="hover:text-[#0B1F36]" href={signupHref}>
            {signupLabel}
          </Link>
          {[
            ["/terms", "Terms"],
            ["/privacy", "Privacy"],
            ["/support", "Support"],
            ["/delete-account", "Close my account"],
            ["/cooperative-disclosures", "Cooperative disclosures"],
          ].map(([href, label]) => (
            <Link
              className="inline-flex min-h-11 items-center hover:text-[#0B1F36]"
              href={href!}
              key={href}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  )
}
