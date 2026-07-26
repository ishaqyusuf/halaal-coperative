import Link from "next/link"
import { buttonVariants } from "@halaalvest/ui/components/button"
import { resolveQaQuickFillContext } from "@halaalvest/utils"
import { OnboardingForm } from "@/components/signup/onboarding-form"
import { SignupShell } from "@/components/signup/signup-shell"
import { verifySignedSignupToken } from "@/lib/signup-token"
import { getServerQaEmailDomains } from "@/lib/server-notifications"

function getVerificationErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "The verification link is no longer valid."
}

type SignupTokenVerificationResult =
  | {
      status: "valid"
      value: ReturnType<typeof verifySignedSignupToken>
    }
  | {
      errorMessage: string
      status: "invalid"
    }

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const token = typeof params.token === "string" ? params.token : ""

  if (!token) {
    return (
      <SignupShell
        eyebrow="Verified setup"
        title="Open onboarding from a secure verification link."
        description="Setup sends the primary admin a time-limited link before a workspace can be created."
      >
        <Link className={buttonVariants({ size: "lg" })} href="/#early-access">
          Request early access
        </Link>
      </SignupShell>
    )
  }

  const verificationResult = ((): SignupTokenVerificationResult => {
    try {
      return {
        status: "valid",
        value: verifySignedSignupToken(token),
      }
    } catch (error) {
      return {
        errorMessage: getVerificationErrorMessage(error),
        status: "invalid",
      }
    }
  })()

  if (verificationResult.status === "invalid") {
    return (
      <SignupShell
        eyebrow="Verified setup"
        title="This verification link can’t be used."
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
