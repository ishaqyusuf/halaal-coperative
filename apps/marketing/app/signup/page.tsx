import type { Metadata } from "next"
import Link from "next/link"
import { getPublishedLegalBundle } from "@halaalvest/db"
import { homepageFontVariables } from "@/components/marketing/homepage/homepage-fonts"
import { HomepageMark } from "@/components/marketing/homepage/homepage-mark"
import { QaPreviewFlashConsumer } from "@/components/qa-preview-flash-consumer"
import { SignupForm } from "@/components/signup/signup-form"
import { verifySignedSignupApprovalToken } from "@/lib/early-access"
import { getMarketingQaQuickFillContext } from "@/lib/qa-form-access.server"
import { getWorkspaceUrlSuffix } from "@/lib/workspace-url-suffix"
import "./signup.css"

export const metadata: Metadata = {
  title: "Sign up · Halaalvest",
  description:
    "Create your cooperative's workspace. Your team and members sign in there.",
}

export const dynamic = "force-dynamic"
export const revalidate = 0

// Workshop marketing/signup-form-directions 03 ("Form + live preview").
// Early access is retired: /signup always opens the sign-up form. An approval
// link sent before that only pre-fills the form.
const themeClassName = `su ${homepageFontVariables}`

function readApproval(value: string | string[] | undefined) {
  if (typeof value !== "string" || !value) return undefined
  try {
    return verifySignedSignupApprovalToken(value)
  } catch {
    return undefined
  }
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const approval = readApproval(params.approvalToken)
  const quickFill = await getMarketingQaQuickFillContext()
  const workspaceUrlSuffix = getWorkspaceUrlSuffix()
  // Static: what the sign-up route checks before it accepts a request.
  const legalBundle = getPublishedLegalBundle()

  return (
    <div className={`hp ${themeClassName}`}>
      <header className="site-header scrolled">
        <div className="wrap">
          <Link aria-label="Halaalvest home" className="brand" href="/">
            <HomepageMark />
            <span>
              Halaal<i>vest</i>
            </span>
          </Link>
          <p className="su-head-aside">
            <span className="long">Already have a workspace? </span>
            <Link href="/login">Sign in</Link>
          </p>
        </div>
      </header>
      {approval ? <QaPreviewFlashConsumer /> : null}
      <SignupForm
        defaultValues={
          approval
            ? {
                cooperativeName: approval.cooperativeName,
                primaryContactEmail: approval.primaryContactEmail,
                primaryContactFullName: approval.primaryContactFullName,
              }
            : undefined
        }
        legalUnavailable={
          legalBundle.acceptanceRequired && !legalBundle.available
        }
        quickFill={quickFill}
        themeClassName={themeClassName}
        workspaceUrlSuffix={workspaceUrlSuffix}
      />
    </div>
  )
}
