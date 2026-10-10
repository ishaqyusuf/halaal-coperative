import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import { PasswordField } from "@/features/auth/components/password-field"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { cn } from "@/lib/utils"
import { View } from "react-native"
import { KeyboardController } from "react-native-keyboard-controller"

export function SignInForm({
  actionLabel,
  canSubmit,
  cooperativeNumber,
  cooperativeVerified,
  error,
  formTitle,
  isSubmitting,
  onCooperativeNumberChange,
  onForgotPassword,
  onPasswordChange,
  onSubmit,
  password,
}: {
  actionLabel: string
  canSubmit: boolean
  cooperativeNumber: string
  cooperativeVerified: boolean
  error: string | null
  formTitle: string
  isSubmitting: boolean
  onCooperativeNumberChange: (value: string) => void
  onForgotPassword: () => void
  onPasswordChange: (value: string) => void
  onSubmit: () => void
  password: string
}) {
  const largeTextLayout = useLargeTextLayout()
  const submitDisabled = !canSubmit || isSubmitting

  return (
    <View className="gap-4">
      {formTitle ? (
        <Text
          accessibilityRole="header"
          className="max-w-[310px] text-[32px] leading-[35px] font-black tracking-[-1px] text-foreground"
          maxFontSizeMultiplier={1.5}
        >
          {formTitle}
        </Text>
      ) : null}

      <View className="gap-2">
        <Text className="text-sm font-semibold text-foreground">
          Cooperative number
        </Text>
        <Input
          accessibilityLabel="Cooperative number"
          autoCapitalize="characters"
          autoComplete="username"
          autoCorrect={false}
          className={cn(
            "h-14 rounded-2xl bg-accent/35",
            cooperativeVerified && "border-brand bg-accent"
          )}
          editable={!isSubmitting}
          onChangeText={onCooperativeNumberChange}
          onSubmitEditing={() => KeyboardController.setFocusTo("next")}
          maxFontSizeMultiplier={1.35}
          placeholder="ABC-0123"
          returnKeyType="next"
          submitBehavior="submit"
          textContentType="username"
          trailing={
            cooperativeVerified ? (
              <View className="bg-brand size-6 items-center justify-center rounded-full">
                <Icon className="size-sm text-brand-foreground" name="Check" />
              </View>
            ) : undefined
          }
          value={cooperativeNumber}
        />
      </View>

      <View className="gap-2">
        <Text className="text-sm font-semibold text-foreground">Password</Text>
        <PasswordField
          autoCapitalize="none"
          autoComplete="current-password"
          editable={!isSubmitting}
          fieldSize="large"
          hideLabel
          inputClassName="rounded-2xl bg-accent/35"
          label="Password"
          onChangeText={onPasswordChange}
          onSubmitEditing={onSubmit}
          returnKeyType="go"
          submitBehavior="blurAndSubmit"
          textContentType="password"
          value={password}
        />
        <Button
          accessibilityLabel="Forgot password"
          className={cn("h-11 self-start px-0", largeTextLayout && "mt-1")}
          disabled={isSubmitting}
          onPress={onForgotPassword}
          size="sm"
          variant="link"
        >
          <Text className="text-xs font-bold">Forgot password?</Text>
        </Button>
      </View>

      {error ? (
        <View
          accessibilityLiveRegion="assertive"
          className="border-l-2 border-destructive bg-destructive/10 px-3 py-2"
        >
          <Text
            accessibilityRole="alert"
            className="text-sm font-medium text-destructive"
          >
            {error}
          </Text>
        </View>
      ) : null}

      <Button
        accessibilityLabel={actionLabel}
        accessibilityState={{ busy: isSubmitting }}
        className={cn(
          "min-h-14 rounded-2xl bg-brand-vivid px-4 py-3 active:bg-brand-vivid/90",
          submitDisabled && "bg-muted opacity-100 active:bg-muted"
        )}
        disabled={submitDisabled}
        onPress={onSubmit}
      >
        <Icon
          className={cn(
            "size-[18px] text-brand-surface",
            submitDisabled && "text-muted-foreground"
          )}
          name="ShieldCheck"
          strokeWidth={2.2}
        />
        <Text
          className={cn(
            "font-bold text-brand-surface",
            submitDisabled && "text-muted-foreground"
          )}
        >
          {actionLabel}
        </Text>
      </Button>
    </View>
  )
}
