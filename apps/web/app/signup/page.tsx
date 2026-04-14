import { SignupForm } from "@/components/signup/signup-form"
import { SignupShell } from "@/components/signup/signup-shell"

export default function SignupPage() {
  const devMode = process.env.NODE_ENV !== "production"

  return (
    <SignupShell
      eyebrow="Public Signup"
      title="Verify the primary contact email before cooperative setup begins."
      description="This public flow keeps signup lightweight, confirms the primary contact first, then moves into a short cooperative profile before the workspace is created."
    >
      <SignupForm devMode={devMode} />
    </SignupShell>
  )
}
