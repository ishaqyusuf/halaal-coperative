import { AppError } from "@halaalvest/errors"

export async function parseMarketingJson(request: Request) {
  try {
    return await request.json()
  } catch (cause) {
    throw new AppError({
      cause,
      code: "VALIDATION_FAILED",
      publicMessage: "The request body must contain valid JSON.",
    })
  }
}
