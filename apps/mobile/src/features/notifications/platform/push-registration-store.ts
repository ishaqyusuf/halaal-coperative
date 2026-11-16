import * as SecureStore from "expo-secure-store"
import {
  parsePushRegistrationRecord,
  type PushRegistrationRecord,
} from "@/features/notifications/model/push-registration-policy"

const PUSH_REGISTRATION_KEY = "halaalvest_push_registration_v1"

export function readPushRegistrationRecord() {
  try {
    return parsePushRegistrationRecord(
      SecureStore.getItem(PUSH_REGISTRATION_KEY)
    )
  } catch {
    return null
  }
}

export function writePushRegistrationRecord(record: PushRegistrationRecord) {
  try {
    SecureStore.setItem(PUSH_REGISTRATION_KEY, JSON.stringify(record))
  } catch {
    // A missing record only costs one extra registration on the next resume.
  }
}
