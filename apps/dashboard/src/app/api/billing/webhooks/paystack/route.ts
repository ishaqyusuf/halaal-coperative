import { handleCooperativePaystackWebhook } from "@halaalvest/api/cooperative-paystack-webhook"

export const runtime = "nodejs"
export function POST(request: Request) {
  return handleCooperativePaystackWebhook.fetch(request)
}
