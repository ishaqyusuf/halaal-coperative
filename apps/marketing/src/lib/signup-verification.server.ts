import { checkTenantSignupAvailability } from "@halaalvest/db"
import type { SignupVerificationPayload } from "./signup-flow"
import { verifySignedSignupToken } from "./signup-token"

type SignupVerificationDependencies = {
  checkAvailability: typeof checkTenantSignupAvailability
  verifyToken: typeof verifySignedSignupToken
}

export type SignupVerificationResult =
  | {
      status: "valid"
      value: SignupVerificationPayload
    }
  | {
      errorMessage: string
      status: "invalid"
    }

const defaultDependencies: SignupVerificationDependencies = {
  checkAvailability: checkTenantSignupAvailability,
  verifyToken: verifySignedSignupToken,
}

function getVerificationErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "The verification link is no longer valid."
}

export async function resolveSignupVerification(
  token: string,
  dependencies: SignupVerificationDependencies = defaultDependencies
): Promise<SignupVerificationResult> {
  let verification: SignupVerificationPayload

  try {
    verification = dependencies.verifyToken(token)
  } catch (error) {
    return {
      errorMessage: getVerificationErrorMessage(error),
      status: "invalid",
    }
  }

  const availability = await dependencies.checkAvailability({
    cooperativeName: verification.cooperativeName,
    workspaceSlug: verification.workspaceSlug,
  })
  const workspaceIsAvailable =
    availability.cooperativeName.available &&
    availability.workspaceSlug.available

  if (!workspaceIsAvailable) {
    return {
      errorMessage: "The verification link has expired.",
      status: "invalid",
    }
  }

  return {
    status: "valid",
    value: verification,
  }
}
