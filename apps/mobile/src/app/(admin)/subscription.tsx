import { Redirect, type Href } from "expo-router"

export default function AdminSubscriptionRoute() {
  return <Redirect href={"/mobile-access" as Href} />
}
