import { NextResponse } from "next/server"
import { z } from "zod"
import {
  confirmExternalAccountDeletion,
  ACCOUNT_DELETION_NOTICE_VERSION,
} from "@halaalvest/db"
import { parseMarketingJson } from "@/lib/parse-json.server"
import { getMarketingServerErrorResponse } from "@/lib/error-response.server"
const schema = z
  .object({
    challengeId: z.string().uuid(),
    token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
    noticeVersion: z.literal(ACCOUNT_DELETION_NOTICE_VERSION),
    confirmed: z.literal(true),
  })
  .strict()
export async function POST(request: Request) {
  try {
    const input = schema.parse(await parseMarketingJson(request))
    const result = await confirmExternalAccountDeletion({
      challengeId: input.challengeId,
      token: input.token,
      noticeVersion: input.noticeVersion,
    })
    return NextResponse.json(
      { requestId: result.requestId, status: result.status },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (error) {
    const response = getMarketingServerErrorResponse(error, { method: "POST" })
    return NextResponse.json(response.body, { status: response.status })
  }
}
