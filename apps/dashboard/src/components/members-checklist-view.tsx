import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import type { ReactNode } from "react"
import type { TenantMigrationSetupMode } from "@halaalvest/db"
import { Badge } from "@halaalvest/ui/components/badge"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import { ArrowRightIcon } from "lucide-react"
import { DashboardPageShell } from "@/components/dashboard"
import { OnePathRail } from "@/components/one-path/one-path-rail"
import { OnePathStep } from "@/components/one-path/one-path-step"
import {
  getGettingStartedStepHref,
  type OnePathRailStepModel,
} from "@/lib/getting-started/getting-started-step-model"

export type MembersChecklistAdminMember = {
  fullName: string
  id: string
  memberNumber: string
}

export type MembersChecklistViewProps = {
  /** The signed-in admin's own member record, or null when none is linked. */
  adminMember: MembersChecklistAdminMember | null
  /** Where "Add my balances/history" (or the fallback) goes. */
  adminMemberHref: string
  /** Staff invite route plus the setup-gate lock label, if it is locked. */
  financeOfficerInvite: { href: string; lockLabel: string | null }
  /** Step 11 link, present only when every member is ready. */
  goLiveHref: string | null
  memberImportHref: string
  membersHref: string
  migrationMode: TenantMigrationSetupMode
  /** Counts from the member registry's migration-completion rule. */
  readiness: { ready: number; total: number }
  /** The shared One Path rail, so step 10 shows the same map as 5–9. */
  railSteps: OnePathRailStepModel[]
}

const actionClassName = "h-11 w-full sm:h-10 sm:w-auto"

function ChecklistRow({
  actions,
  badge,
  children,
  index,
  title,
}: {
  actions: ReactNode
  badge?: ReactNode
  children: ReactNode
  index: number
  title: string
}) {
  return (
    <li className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex min-w-0 gap-3">
        <span
          aria-hidden="true"
          className="flex size-7 shrink-0 items-center justify-center border border-border bg-background text-xs font-semibold text-muted-foreground"
        >
          {index}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {badge}
          </div>
          <div className="mt-1 text-sm leading-6 text-muted-foreground">
            {children}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
        {actions}
      </div>
    </li>
  )
}

export function MembersChecklistView({
  adminMember,
  adminMemberHref,
  financeOfficerInvite,
  goLiveHref,
  memberImportHref,
  membersHref,
  migrationMode,
  railSteps,
  readiness,
}: MembersChecklistViewProps) {
  const isBroughtForward = migrationMode === "brought_forward"
  const recordKind = isBroughtForward ? "opening balances" : "full history"
  const readinessLabel = `${readiness.ready} of ${readiness.total} ${
    readiness.total === 1 ? "member" : "members"
  } ready`

  return (
    <DashboardPageShell>
      <section className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <OnePathRail currentStepKey="add-members" steps={railSteps} />
        <div className="min-w-0">
          <OnePathStep
            backHref={getGettingStartedStepHref("review-setup")}
            aside={
              <p>
                Members can sign in once their {recordKind} match your records.
                Doing your own record first shows you exactly what each member
                needs.
              </p>
            }
            lede={
              isBroughtForward
                ? "Add each member's opening balances from your books, starting with your own record."
                : "Rebuild each member's full history from your records, starting with your own."
            }
            primary={
              goLiveHref ? (
                <Link
                  className={cn(buttonVariants({}), actionClassName)}
                  href={goLiveHref}
                >
                  Go live
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              ) : (
                <Button
                  aria-describedby="members-readiness"
                  className={actionClassName}
                  disabled
                  type="button"
                >
                  Go live
                </Button>
              )
            }
            stepKey="add-members"
            title="Now bring your members in"
          >
            <div className="flex flex-col gap-4">
              <p
                aria-live="polite"
                className="text-sm font-medium text-foreground"
                id="members-readiness"
              >
                {readinessLabel}
              </p>
              <ol className="divide-y divide-border/70 border border-border/70">
                <ChecklistRow
                  actions={
                    <Link
                      className={cn(buttonVariants({}), actionClassName)}
                      href={adminMemberHref}
                    >
                      {adminMember
                        ? isBroughtForward
                          ? "Add my balances"
                          : "Add my history"
                        : "Add your own member record"}
                    </Link>
                  }
                  index={1}
                  title="Your own record"
                >
                  {adminMember ? (
                    <>
                      <span className="block font-medium text-foreground">
                        {adminMember.fullName}
                      </span>
                      <span className="block">
                        Access code{" "}
                        <span className="font-mono text-foreground">
                          {adminMember.memberNumber}
                        </span>{" "}
                        · {recordKind}
                      </span>
                    </>
                  ) : (
                    <>
                      No member record is linked to your account yet. Add
                      yourself first, then your {recordKind}.
                    </>
                  )}
                </ChecklistRow>
                <ChecklistRow
                  actions={
                    <>
                      <Link
                        className={cn(
                          buttonVariants({ variant: "outline" }),
                          actionClassName
                        )}
                        href={membersHref}
                      >
                        Add members
                      </Link>
                      <Link
                        className={cn(
                          buttonVariants({ variant: "outline" }),
                          actionClassName
                        )}
                        href={memberImportHref}
                      >
                        Upload spreadsheet
                      </Link>
                    </>
                  }
                  index={2}
                  title="Everyone else"
                >
                  One at a time or upload your member spreadsheet.
                </ChecklistRow>
                <ChecklistRow
                  actions={
                    financeOfficerInvite.lockLabel ? (
                      <Button
                        className={actionClassName}
                        disabled
                        type="button"
                        variant="outline"
                      >
                        {financeOfficerInvite.lockLabel}
                      </Button>
                    ) : (
                      <Link
                        className={cn(
                          buttonVariants({ variant: "outline" }),
                          actionClassName
                        )}
                        href={financeOfficerInvite.href}
                      >
                        Invite finance officer
                      </Link>
                    )
                  }
                  badge={<Badge variant="outline">Optional</Badge>}
                  index={3}
                  title="Invite your finance officer"
                >
                  Give them their own sign-in so they can help enter member
                  records.
                </ChecklistRow>
                {goLiveHref ? (
                  <ChecklistRow
                    actions={
                      <Link
                        className={cn(buttonVariants({}), actionClassName)}
                        href={goLiveHref}
                      >
                        Go live
                        <ArrowRightIcon data-icon="inline-end" />
                      </Link>
                    }
                    index={4}
                    title="Go live"
                  >
                    Every member is ready. Check the balances and start live
                    operations.
                  </ChecklistRow>
                ) : null}
              </ol>
            </div>
          </OnePathStep>
        </div>
      </section>
    </DashboardPageShell>
  )
}
