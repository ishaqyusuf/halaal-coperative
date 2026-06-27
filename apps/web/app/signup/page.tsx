import { SignupForm } from "@/components/signup/signup-form"
import { SignupShell } from "@/components/signup/signup-shell"

export default function SignupPage() {
  const devMode = process.env.NODE_ENV !== "production"

  return (
    <SignupShell
      eyebrow="Cooperative signup"
      title="Create a governed cooperative workspace."
      description="Start with the accountable admin, reserve the tenant URL, and continue only after the primary contact verifies their email."
    >
      <SignupForm devMode={devMode} />
    </SignupShell>
  )
}
