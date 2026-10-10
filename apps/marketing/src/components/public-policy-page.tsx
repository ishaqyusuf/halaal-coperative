import { ExternalDeletionRequestForm } from "@/components/external-deletion-request-form"
import Link from "next/link"
import {
  isPublicPolicyEffective,
  publicPolicies,
  policyPublications,
  publicDeletionFlowCopy,
} from "@/lib/public-policies"
import { isExternalDeletionRequestAvailable } from "@/lib/external-deletion-readiness"
import { StoreSubscriptionCancellationHelp } from "./store-subscription-cancellation-help"

export function PublicPolicyPage({
  policy,
}: {
  policy: keyof typeof publicPolicies
}) {
  const document = publicPolicies[policy]!
  const publication = policyPublications[policy]
  const deletion = policy === "delete-account"
  const effective = isPublicPolicyEffective(policy)
  return (
    <main
      className="mx-auto w-full max-w-3xl px-5 py-12 text-foreground sm:px-8"
      data-policy-approval-hash={
        effective && publication.status === "published"
          ? publication.approvedSnapshotHash
          : undefined
      }
    >
      <p className="text-sm font-semibold">HalaalVest · Legal and support</p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        {document.title}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Revision {publication.version} ·{" "}
        {publication.status === "published" && effective
          ? `Effective ${publication.effectiveAt}`
          : publication.status === "published"
            ? "Publication pending verification · Not yet effective"
            : "Draft for review · Not yet effective"}
      </p>
      {!effective ? (
        <p className="mt-6 border-l-2 border-amber-600 pl-4 text-sm leading-6">
          Effective approval is pending. Contacts, retention and applicable
          terms must be confirmed before launch. This page is not evidence of
          legal approval.
        </p>
      ) : null}
      <p className="mt-8 text-lg leading-8">{document.introduction}</p>
      <div className="mt-10 space-y-8">
        {document.sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-xl font-semibold">{section.title}</h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              {section.body}
            </p>
          </section>
        ))}
      </div>
      {deletion ? <StoreSubscriptionCancellationHelp /> : null}
      {deletion ? (
        isExternalDeletionRequestAvailable() ? (
          <ExternalDeletionRequestForm />
        ) : (
          <p
            className="mt-8 rounded-xl border border-amber-600/40 p-5 text-sm leading-6"
            role="status"
          >
            {publicDeletionFlowCopy.unavailable}
          </p>
        )
      ) : null}
      {(deletion || policy === "support") && (
        <a
          className="mt-8 inline-flex min-h-11 items-center underline underline-offset-4"
          href={`mailto:hello@halaalvest.com?subject=${encodeURIComponent(deletion ? "HalaalVest account deletion request" : "HalaalVest support request")}`}
        >
          {deletion
            ? publicDeletionFlowCopy.contactLabel
            : "Email hello@halaalvest.com"}
        </a>
      )}
      <nav
        aria-label="Legal and support"
        className="mt-12 flex flex-wrap gap-x-6 gap-y-2 border-t pt-6 text-sm"
      >
        {Object.entries(publicPolicies).map(([slug, item]) => (
          <Link
            aria-current={slug === policy ? "page" : undefined}
            className="inline-flex min-h-11 items-center underline underline-offset-4"
            href={`/${slug}`}
            key={slug}
          >
            {item.title}
          </Link>
        ))}
      </nav>
    </main>
  )
}
