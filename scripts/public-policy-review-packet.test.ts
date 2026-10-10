import { expect, test } from "bun:test"
import { publicPolicies } from "../packages/domain/src/modules/public-policies"
import { accountDeletionNoticeCopy } from "../packages/domain/src/modules/account-privacy-notice"
import { ACCOUNT_DELETION_NOTICE_VERSION } from "../packages/db/src/queries/account-privacy"
import { renderPublicPolicyReviewPacket } from "./public-policy-review-packet"

test("review packet includes all six exact-source drafts and deletion email copy", () => {
  const packet = renderPublicPolicyReviewPacket()
  for (const page of [
    "terms",
    "privacy",
    "support",
    "delete-account",
    "billing-policy",
    "cooperative-disclosures",
  ]) {
    expect(packet).toContain(`## /${page} — `)
  }
  expect(packet).toContain(
    publicPolicies["delete-account"].interactiveCopy.email.bodyText
  )
  expect(packet).toContain("not a published policy")
  expect(packet).toContain("It deliberately excludes publication dates")
  expect(packet).toContain(ACCOUNT_DELETION_NOTICE_VERSION)
  expect(packet).toContain(accountDeletionNoticeCopy.scope)
  for (const consequence of accountDeletionNoticeCopy.consequences)
    expect(packet).toContain(consequence)
  expect(packet.match(/`[0-9a-f]{64}`/g)).toHaveLength(6)
  const changed = {
    ...publicPolicies,
    "delete-account": {
      ...publicPolicies["delete-account"],
      interactiveCopy: {
        ...publicPolicies["delete-account"].interactiveCopy,
        email: {
          ...publicPolicies["delete-account"].interactiveCopy.email,
          bodyText: "Changed review copy",
        },
      },
    },
  }
  expect(renderPublicPolicyReviewPacket(changed)).not.toBe(packet)
})
