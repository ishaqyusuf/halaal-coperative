import {
  runConsumerReleaseCheck,
  type ConsumerReleaseContext,
} from "./toolkit/9a324b2c4e759d4713375e7853ef7d791c357552/src/release/consumer"
import { createHalalvestProviderBindings } from "./halalvest-provider-bundle"

export async function checkRelease(context: ConsumerReleaseContext) {
  return runConsumerReleaseCheck(
    context,
    createHalalvestProviderBindings(context),
  )
}
