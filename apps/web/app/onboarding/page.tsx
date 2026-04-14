import Link from "next/link"
import { buttonVariants } from "@halaal-vest/ui/components/button"
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
        eyebrow="Onboarding"
        title="A verification link is required."
        description="Start from the signup page so we can capture and verify the cooperative primary contact email first."
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
        eyebrow="Onboarding"
        title="Complete cooperative setup from the verified signup link."
        description="The verification token brings in the primary contact details first, then the cooperative can finish a short profile before the workspace is opened."
      >
        <OnboardingForm devMode={devMode} token={token} verification={verification} />
      </SignupShell>
    )
  } catch (error) {
    return (
      <SignupShell
        eyebrow="Onboarding"
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
