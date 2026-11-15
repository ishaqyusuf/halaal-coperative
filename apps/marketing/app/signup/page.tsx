import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@halaalvest/ui/components/alert"
import { getPublishedLegalBundle } from "@halaalvest/db"
import { redirect } from "next/navigation"
import { EarlyAccessForm } from "@/components/marketing/early-access-form"
import { QaPreviewFlashConsumer } from "@/components/qa-preview-flash-consumer"
import { SignupForm } from "@/components/signup/signup-form"
import { SignupShell } from "@/components/signup/signup-shell"
import { verifySignedSignupApprovalToken } from "@/lib/early-access"
import { getMarketingConfig } from "@/lib/marketing-config"
import { getMarketingQaQuickFillContext } from "@/lib/qa-form-access.server"
import { getWorkspaceUrlSuffix } from "@/lib/workspace-url-suffix"

export const dynamic = "force-dynamic"
export const revalidate = 0

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
  const quickFill = await getMarketingQaQuickFillContext()
  const workspaceUrlSuffix = getWorkspaceUrlSuffix()
  // Static: what the sign-up route checks before it accepts a request.
  const legalBundle = getPublishedLegalBundle()

  if (requiresApproval && approvalResult.status === "missing") {
    redirect("/#early-access")
  }

  if (requiresApproval && approvalResult.status === "invalid") {
    return (
      <SignupShell
        eyebrow="Early access"
        stage="sign-up"
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
    <SignupShell stage="sign-up">
      {approval ? <QaPreviewFlashConsumer /> : null}
      <SignupForm
        legalUnavailable={
          legalBundle.acceptanceRequired && !legalBundle.available
        }
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
