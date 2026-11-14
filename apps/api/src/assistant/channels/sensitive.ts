/**
 * Chats must never carry passwords, PINs, OTPs, BVN/NIN or card/bank details.
 * A matching message is refused and stored redacted; it never reaches a turn.
 */

const secretWords =
  /\b(password|passcode|pass\s*word|pin|otp|one[-\s]?time\s+code|cvv|cvc|bvn|nin|card\s*number|account\s*number|acct\s*no|sort\s*code)\b/i

/** Long digit runs (spaces or dashes allowed between digits). */
function longestDigitRun(text: string) {
  let longest = 0
  for (const match of text.matchAll(/\d(?:[\s-]?\d)*/g))
    longest = Math.max(longest, match[0].replace(/\D/g, "").length)
  return longest
}

export function looksSensitive(text: string) {
  const digits = longestDigitRun(text)
  // NUBAN (10), BVN/NIN (11) and card numbers (13–19).
  if (digits >= 10) return true
  if (!secretWords.test(text)) return false
  // "my pin is 1234", "password: hunter2"
  return digits >= 4 || /\b(is|:|=)\s*\S+/i.test(text)
}

export const sensitiveRefusal =
  "Please don't send passwords, PINs, codes, BVN/NIN or card or bank details here. I didn't keep that message. Use the Halaalvest app for anything that needs them."
