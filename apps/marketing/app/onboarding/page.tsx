import Link from "next/link"
import { buttonVariants } from "@halaalvest/ui/components/button"
import { resolveQaQuickFillContext } from "@halaalvest/utils"
import { OnboardingForm } from "@/components/signup/onboarding-form"
import { SignupShell } from "@/components/signup/signup-shell"
import { getServerQaEmailDomains } from "@/lib/server-notifications"
import { resolveSignupVerification } from "@/lib/signup-verification.server"

export const dynamic = "force-dynamic"

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const token = typeof params.token === "string" ? params.token : ""
  const completed = params.status === "completed"

  if (!token) {
    if (completed) {
      return (
        <SignupShell
          eyebrow="Verified setup"
          stage="verify"
          title="This verification link has expired."
          description="This link was already used to create a cooperative workspace and can’t be used again."
        >
          <Link className={buttonVariants({ size: "lg" })} href="/signup">
            Start a new signup
          </Link>
        </SignupShell>
      )
    }

    return (
      <SignupShell
        eyebrow="Verified setup"
        stage="verify"
        title="Open onboarding from a secure verification link."
        description="Setup sends the primary admin a time-limited link before a workspace can be created."
      >
        <Link className={buttonVariants({ size: "lg" })} href="/#early-access">
          Request early access
        </Link>
      </SignupShell>
    )
  }

  const verificationResult = await resolveSignupVerification(token)

  if (verificationResult.status === "invalid") {
    const linkExpired =
      verificationResult.errorMessage === "The verification link has expired."

    return (
      <SignupShell
        eyebrow="Verified setup"
        stage="verify"
        title={
          linkExpired
            ? "This verification link has expired."
            : "This verification link can’t be used."
        }
        description={verificationResult.errorMessage}
      >
        <Link className={buttonVariants({ size: "lg" })} href="/signup">
          Restart signup
        </Link>
      </SignupShell>
    )
  }

  const verification = verificationResult.value
  const quickFill = resolveQaQuickFillContext({
    authenticatedEmail: verification.primaryContactEmail,
    configuredDomains: getServerQaEmailDomains(),
    isDevelopment: process.env.NODE_ENV !== "production",
  })

  return (
    <SignupShell
      eyebrow="Verified setup"
      stage="profile"
      title="Finish the cooperative workspace profile."
      description="The verified admin is confirmed. Save the operating profile and first password, then move into guided dashboard setup."
    >
      <OnboardingForm
        quickFill={quickFill}
        token={token}
        verification={verification}
      />
    </SignupShell>
  )
}
