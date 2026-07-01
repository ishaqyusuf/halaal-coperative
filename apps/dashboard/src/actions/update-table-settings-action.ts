"use server"

import { addYears } from "date-fns"
import { cookies } from "next/headers"

type Props = {
  key: string
  data: unknown
}

export async function updateTableSettingsAction({ key, data }: Props) {
  const cookieStore = await cookies()

  cookieStore.set(key, JSON.stringify(data), {
    expires: addYears(new Date(), 10),
  })

  return data
}
