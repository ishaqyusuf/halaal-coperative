import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { FinanceSettingsFrame } from "@/components/finance-settings/finance-settings-frame"

/**
 * Opening balances once the cooperative is live: nothing to add here, and
 * one member's records are corrected from their own page.
 */
export function MigrationDoneView({ memberId }: { memberId?: string }) {
  return (
    <FinanceSettingsFrame>
      <section className="grid gap-3">
        <h2 className="text-xl font-semibold">Opening balances are done</h2>
        <p className="text-lg text-muted-foreground">
          Your cooperative is live, so members’ past records are in and can’t
          be added here any more.
        </p>
        <p className="text-base text-muted-foreground">
          To fix one member’s records, open{" "}
          <Link
            className="inline-flex min-h-11 items-center font-medium text-foreground underline underline-offset-4"
            href={memberId ? `/members/${memberId}` : "/members"}
          >
            {memberId ? "their member page" : "their page under Members"}
          </Link>
          .
        </p>
      </section>
    </FinanceSettingsFrame>
  )
}
