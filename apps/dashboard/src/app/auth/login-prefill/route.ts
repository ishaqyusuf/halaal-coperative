import { resolveTenantAsync } from "@halaalvest/db"
import type { NextRequest } from "next/server"
import {
  allowLoginPrefill,
  handleLoginPrefillPost,
  redirectLoginPrefillToLogin,
} from "@/lib/login-prefill"

export function POST(request: NextRequest) {
  return handleLoginPrefillPost(request, {
    allowPrefill: allowLoginPrefill,
    resolveTenantAsync,
  })
}

export function GET(request: NextRequest) {
  return redirectLoginPrefillToLogin(request)
}
