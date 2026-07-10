import { SignupForm } from "@/components/signup/signup-form"
import { SignupShell } from "@/components/signup/signup-shell"

function parseDomainLike(value: string | undefined) {
  const trimmed = value?.trim()

  if (!trimmed) return null

  try {
    return new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`).host
  } catch {
    return trimmed.replace(/^https?:\/\//, "").replace(/\/.*$/, "") || null
  }
}

function getWorkspaceUrlSuffix() {
  const configuredDomain =
    parseDomainLike(process.env.PLATFORM_ROOT_DOMAIN) ??
    "halaalvest.localhost"

  return `.${configuredDomain.replace(/^\./, "")}`
}

export default function SignupPage() {
  const devMode = process.env.NODE_ENV !== "production"
  const workspaceUrlSuffix = getWorkspaceUrlSuffix()

  return (
    <SignupShell
      eyebrow="Cooperative signup"
      title="Create a governed cooperative workspace."
      description="Start with the accountable admin, reserve the cooperative URL, and continue only after the primary contact verifies their email."
    >
      <SignupForm devMode={devMode} workspaceUrlSuffix={workspaceUrlSuffix} />
    </SignupShell>
  )
}
