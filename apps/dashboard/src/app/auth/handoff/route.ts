import {
  consumeWorkspaceSessionHandoff,
  findActiveMembershipAsync,
  findUserByIdAsync,
  resolveTenantAsync,
} from "@halaalvest/db"
import type { NextRequest } from "next/server"
import {
  handleWorkspaceSessionHandoffPost,
  redirectWorkspaceSessionHandoffToLogin,
} from "@/lib/workspace-session-handoff"

const handoffDeps = {
  consumeWorkspaceSessionHandoff,
  findActiveMembershipAsync,
  findUserByIdAsync,
  resolveTenantAsync,
}

export async function POST(request: NextRequest) {
  return handleWorkspaceSessionHandoffPost(request, handoffDeps)
}

export function GET(request: NextRequest) {
  return redirectWorkspaceSessionHandoffToLogin(request)
}
