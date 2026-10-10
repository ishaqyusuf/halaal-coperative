import Link from "next/link"
import { ACCOUNT_DELETION_NOTICE_VERSION } from "@halaalvest/db"
import { ExternalDeletionVerification } from "@/components/external-deletion-verification"
export const metadata = {
  title: "Verify account deletion request | HalaalVest",
  robots: { index: false, follow: false },
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ challenge?: string }>
}) {
  const { challenge } = await searchParams
  return (
    <main className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="text-3xl font-semibold">
        Verify account deletion request
      </h1>
      <p className="my-5">Review the request before submitting it.</p>
      {challenge ? (
        <ExternalDeletionVerification
          challengeId={challenge}
          noticeVersion={ACCOUNT_DELETION_NOTICE_VERSION}
        />
      ) : (
        <p role="alert">
          This verification link is incomplete.{" "}
          <Link className="underline" href="/delete-account">
            Request a new link
          </Link>
          .
        </p>
      )}
    </main>
  )
}
