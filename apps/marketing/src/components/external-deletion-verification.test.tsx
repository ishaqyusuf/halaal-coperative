import { expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { accountDeletionNoticeCopy } from "@halaalvest/domain/account-privacy-notice"
import { AccountDeletionNoticeSummary } from "./external-deletion-verification"

test("public verification presents the complete versioned deletion notice", () => {
  const html = renderToStaticMarkup(<AccountDeletionNoticeSummary />)
  expect(html).toContain('aria-label="Account deletion consequences"')
  expect(html).toContain(accountDeletionNoticeCopy.scope)
  for (const consequence of accountDeletionNoticeCopy.consequences)
    expect(html).toContain(consequence)
  expect(html.match(/<li>/g)).toHaveLength(
    accountDeletionNoticeCopy.consequences.length
  )
})
