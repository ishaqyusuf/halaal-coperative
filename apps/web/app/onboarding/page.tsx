import Link from "next/link"
import { buttonVariants } from "@halaalvest/ui/components/button"
import { OnboardingForm } from "@/components/signup/onboarding-form"
import { SignupShell } from "@/components/signup/signup-shell"
import { verifySignedSignupToken } from "@/lib/signup-token"

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const token = typeof params.token === "string" ? params.token : ""
  const devMode = process.env.NODE_ENV !== "production"

  if (!token) {
    return (
      <SignupShell
        eyebrow="Verified setup"
        title="Open onboarding from a secure verification link."
        description="Signup sends the primary admin a time-limited link before a workspace can be created."
      >
        <Link className={buttonVariants({ size: "lg" })} href="/signup">
          Go to signup
        </Link>
      </SignupShell>
    )
  }

  try {
    const verification = verifySignedSignupToken(token)

    return (
      <SignupShell
        eyebrow="Verified setup"
        title="Finish the cooperative workspace profile."
        description="The verified admin is confirmed. Save the operating profile and first password, then move into guided dashboard setup."
      >
        <OnboardingForm
          devMode={devMode}
          token={token}
          verification={verification}
        />
      </SignupShell>
    )
  } catch (error) {
    return (
      <SignupShell
        eyebrow="Verified setup"
        title="This verification link can’t be used."
        description={
          error instanceof Error
            ? error.message
            : "The verification link is no longer valid."
        }
      >
        <Link className={buttonVariants({ size: "lg" })} href="/signup">
          Restart signup
        </Link>
      </SignupShell>
    )
  }
}
