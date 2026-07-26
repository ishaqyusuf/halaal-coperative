import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@halaalvest/ui/components/alert"
import { redirect } from "next/navigation"
import { resolveQaQuickFillContext } from "@halaalvest/utils"
import { EarlyAccessForm } from "@/components/marketing/early-access-form"
import { SignupForm } from "@/components/signup/signup-form"
import { SignupShell } from "@/components/signup/signup-shell"
import { verifySignedSignupApprovalToken } from "@/lib/early-access"
import { getMarketingConfig } from "@/lib/marketing-config"
import { getServerQaEmailDomains } from "@/lib/server-notifications"

export const dynamic = "force-dynamic"
export const revalidate = 0

function parseDomainLike(value: string | undefined) {
  const trimmed = value?.trim()

  if (!trimmed) return null

  try {
    return new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`)
      .host
  } catch {
    return trimmed.replace(/^https?:\/\//, "").replace(/\/.*$/, "") || null
  }
}

function getWorkspaceUrlSuffix() {
  const configuredDomain =
    parseDomainLike(process.env.PLATFORM_ROOT_DOMAIN) ?? "halaalvest.localhost"

  return `.${configuredDomain.replace(/^\./, "")}`
}

function getTokenParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : ""
}

function getApprovalErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "The early access approval link is no longer valid."
}

type ApprovalResult =
  | {
      status: "valid"
      token: string
      value: ReturnType<typeof verifySignedSignupApprovalToken>
    }
  | {
      errorMessage: string | null
      status: "missing" | "invalid"
    }

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const marketing = getMarketingConfig()
  const approvalToken = getTokenParam(params.approvalToken)
  const requiresApproval = marketing.earlyAccessModeEnabled
  const approvalResult = ((): ApprovalResult => {
    if (!approvalToken) {
      return {
        errorMessage: null,
        status: "missing",
      }
    }

    try {
      return {
        status: "valid",
        token: approvalToken,
        value: verifySignedSignupApprovalToken(approvalToken),
      }
    } catch (error) {
      return {
        errorMessage: getApprovalErrorMessage(error),
        status: "invalid",
      }
    }
  })()
  const devMode = process.env.NODE_ENV !== "production"
  const quickFill = resolveQaQuickFillContext({
    authenticatedEmail:
      approvalResult.status === "valid"
        ? approvalResult.value.primaryContactEmail
        : null,
    configuredDomains: getServerQaEmailDomains(),
    isDevelopment: devMode,
  })
  const workspaceUrlSuffix = getWorkspaceUrlSuffix()

  if (requiresApproval && approvalResult.status === "missing") {
    redirect("/#early-access")
  }

  if (requiresApproval && approvalResult.status === "invalid") {
    return (
      <SignupShell
        eyebrow="Early access"
        title="This approval link cannot be used."
        description="Cooperative setup opens only from a valid approved early access link while early access mode is enabled."
      >
        <Alert variant="destructive">
          <AlertTitle>Approval link invalid</AlertTitle>
          <AlertDescription>{approvalResult.errorMessage}</AlertDescription>
        </Alert>
        <EarlyAccessForm quickFill={quickFill} />
      </SignupShell>
    )
  }

  const approval =
    approvalResult.status === "valid" ? approvalResult.value : undefined

  return (
    <SignupShell
      eyebrow={approval ? "Approved setup" : "Cooperative setup"}
      title="Create a governed cooperative workspace."
      description={
        approval
          ? "Your early access request is approved. Reserve the cooperative URL and continue through email verification."
          : "Start with the accountable admin, reserve the cooperative URL, and continue only after the primary contact verifies their email."
      }
    >
      <SignupForm
        approvalToken={
          approvalResult.status === "valid" ? approvalResult.token : null
        }
        defaultValues={
          approval
            ? {
                cooperativeName: approval.cooperativeName,
                primaryContactEmail: approval.primaryContactEmail,
                primaryContactFullName: approval.primaryContactFullName,
              }
            : undefined
        }
        quickFill={quickFill}
        workspaceUrlSuffix={workspaceUrlSuffix}
      />
    </SignupShell>
  )
}
