import { FloatingBottomSheet } from "@/components/floating-bottom-sheet"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import { useAuthContext } from "@/hooks/use-auth"
import { useColors } from "@/hooks/use-color"
import { useRouter } from "expo-router"
import { useMemo, useState } from "react"
import { View } from "react-native"

export function SignInScreen() {
  const { signInAs, signInWithPassword } = useAuthContext()
  const colors = useColors()
  const router = useRouter()
  const [tenantSlug, setTenantSlug] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const canShowDevShortcuts = process.env.NODE_ENV !== "production"
  const canSubmit = useMemo(
    () => Boolean(tenantSlug.trim() && email.trim() && password),
    [email, password, tenantSlug]
  )

  async function handleSubmit() {
    if (!canSubmit || isSubmitting) return

    setError(null)
    setIsSubmitting(true)

    try {
      await signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
        tenantSlug: tenantSlug.trim().toLowerCase(),
      })
      router.replace("/")
    } catch {
      setError("The cooperative code or account details were invalid.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDevShortcut(role: "member" | "admin") {
    await signInAs(role)
    router.replace("/")
  }

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <View className="flex-1 justify-between px-6 pt-10 pb-8">
        <View className="gap-8">
          <View className="h-16 w-16 items-center justify-center rounded-md bg-primary">
            <Text className="text-3xl font-black text-primary-foreground">
              H
            </Text>
          </View>
          <View className="gap-3">
            <Text className="text-4xl leading-[44px] font-black text-foreground">
              Halaalvest
            </Text>
            <Text className="max-w-[320px] text-base leading-6 text-muted-foreground">
              Cooperative finance, commitments, shares, and member operations in
              one white-label mobile shell.
            </Text>
          </View>
        </View>

        <View className="rounded-md border border-border bg-card p-4">
          <View className="flex-row items-center gap-3">
            <Icon name="ShieldCheck" className="size-md text-success" />
            <Text className="flex-1 text-sm leading-5 text-muted-foreground">
              Signed mobile sessions keep member and staff access scoped to the
              selected cooperative.
            </Text>
          </View>
        </View>
      </View>

      <FloatingBottomSheet
        accessibilityLabel="Choose mobile workspace"
        onClose={() => undefined}
        snapPoints={canShowDevShortcuts ? ["66%"] : ["54%"]}
        title="Sign in"
        visible
      >
        <View className="gap-3 px-5 pt-2 pb-6">
          <Input
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSubmitting}
            onChangeText={setTenantSlug}
            placeholder="Cooperative code"
            returnKeyType="next"
            value={tenantSlug}
          />
          <Input
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            editable={!isSubmitting}
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Email"
            returnKeyType="next"
            textContentType="emailAddress"
            value={email}
          />
          <Input
            autoCapitalize="none"
            editable={!isSubmitting}
            onChangeText={setPassword}
            onSubmitEditing={handleSubmit}
            placeholder="Password"
            returnKeyType="go"
            secureTextEntry
            textContentType="password"
            value={password}
          />
          {error ? (
            <Text className="text-sm font-medium text-destructive">
              {error}
            </Text>
          ) : null}
          <Button
            className="h-12"
            disabled={!canSubmit || isSubmitting}
            onPress={handleSubmit}
          >
            <Icon
              name="ShieldCheck"
              className="size-base text-primary-foreground"
            />
            <Text>{isSubmitting ? "Signing in" : "Sign in"}</Text>
          </Button>
          {canShowDevShortcuts ? (
            <View className="gap-3 pt-2">
              <Text className="text-center text-xs font-semibold text-muted-foreground uppercase">
                Development shortcuts
              </Text>
              <Button
                className="h-12"
                onPress={() => handleDevShortcut("member")}
                variant="outline"
              >
                <Icon name="User" className="size-base text-foreground" />
                <Text>Continue as Member</Text>
              </Button>
              <Button
                className="h-12"
                onPress={() => handleDevShortcut("admin")}
                variant="outline"
              >
                <Icon
                  name="ShieldCheck"
                  className="size-base text-foreground"
                />
                <Text>Continue as Admin</Text>
              </Button>
            </View>
          ) : null}
        </View>
      </FloatingBottomSheet>
    </SafeArea>
  )
}
