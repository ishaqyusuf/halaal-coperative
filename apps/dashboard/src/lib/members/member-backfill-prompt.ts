function monthKeyFromDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function monthKeyFromDateString(value: string) {
  const match = /^(\d{4})-(\d{2})/.exec(value)

  if (!match) {
    return null
  }

  return `${match[1]}-${match[2]}`
}

export function shouldPromptMemberBackfill(joinedAt: string, now = new Date()) {
  const joinedMonth = monthKeyFromDateString(joinedAt)

  if (!joinedMonth) {
    return false
  }

  return joinedMonth < monthKeyFromDate(now)
}
