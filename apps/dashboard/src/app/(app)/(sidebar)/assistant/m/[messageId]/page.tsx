import type { Metadata } from "next"
import { AssistantMessageLink } from "@/components/general-assistant/assistant-link-pages"

export const metadata: Metadata = {
  title: "Saved answer | Halaalvest",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
}

/**
 * A saved assistant answer (`assistantHrefs.message`). Signed-out visitors
 * are sent to `/login?next=<this path>` by the proxy and the sidebar layout.
 * Opening it only reads: it re-authorizes the link, then opens the chat
 * scrolled to that answer.
 */
export default async function AssistantMessagePage({
  params,
}: {
  params: Promise<{ messageId: string }>
}) {
  const { messageId } = await params
  return <AssistantMessageLink messageId={messageId} />
}
