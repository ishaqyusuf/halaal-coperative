import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { AuthField } from "@/features/auth/components/auth-field"
import { OtpField } from "@/features/auth/components/otp-field"
import { PasswordField } from "@/features/auth/components/password-field"
import { type RecoveryPresentation } from "@/features/auth/model/recovery-presentation"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { cn } from "@/lib/utils"
import { View } from "react-native"
import { KeyboardController } from "react-native-keyboard-controller"

function RecoveryAction({
  busy,
  disabled,
  label,
  onPress,
}: {
  busy?: boolean
  disabled: boolean
  label: string
  onPress: () => void
}) {
  const largeTextLayout = useLargeTextLayout()

  return (
    <Button
      accessibilityLabel={label}
      accessibilityState={{ busy: Boolean(busy) }}
      className={cn(
        "bg-brand-surface active:bg-brand-surface/90 rounded-xl px-4 py-3",
        largeTextLayout ? "min-h-16" : "min-h-14"
      )}
      disabled={disabled}
      onPress={onPress}
    >
      <Text
        className="text-brand-surface-foreground min-w-0 font-bold"
        maxFontSizeMultiplier={1.35}
        numberOfLines={2}
      >
        {label}
      </Text>
      <View className="bg-brand-warm size-6 items-center justify-center rounded-full">
        <Icon className="text-brand-surface size-3.5" name="ArrowRight" />
      </View>
    </Button>
  )
}

export function RecoveryRequestStep({
  canRequest,
  cooperativeNumber,
  email,
  error,
  onCooperativeNumberChange,
  onEmailChange,
  onRequest,
  presentation,
  submitting,
}: {
  canRequest: boolean
  cooperativeNumber: string
  email: string
  error: string | null
  onCooperativeNumberChange: (value: string) => void
  onEmailChange: (value: string) => void
  onRequest: () => void
  presentation: RecoveryPresentation
  submitting: boolean
}) {
  return (
    <View className="gap-5">
      <AuthField
        autoCapitalize="characters"
        autoComplete="username"
        autoCorrect={false}
        inputClassName="rounded-2xl bg-card"
        label="Cooperative number"
        maxFontSizeMultiplier={1.35}
        onChangeText={onCooperativeNumberChange}
        onSubmitEditing={() => KeyboardController.setFocusTo("next")}
        placeholder="ABC-0123"
        returnKeyType="next"
        submitBehavior="submit"
        textContentType="username"
        value={cooperativeNumber}
      />
      <AuthField
        autoCapitalize="none"
        autoComplete="email"
        inputClassName="rounded-2xl bg-card"
        keyboardType="email-address"
        label="Email address"
        maxFontSizeMultiplier={1.35}
        onChangeText={onEmailChange}
        onSubmitEditing={onRequest}
        placeholder="member@example.com"
        returnKeyType="go"
        submitBehavior="blurAndSubmit"
        textContentType="emailAddress"
        value={email}
      />
      {error ? <RecoveryError message={error} /> : null}
      <RecoveryAction
        busy={submitting}
        disabled={!canRequest}
        label={submitting ? "Requesting code" : presentation.actionLabel}
        onPress={onRequest}
      />
    </View>
  )
}

export function RecoveryCodeStep({
  canContinue,
  code,
  destination,
  error,
  onCodeChange,
  onContinue,
  onResend,
  presentation,
  submitting,
}: {
  canContinue: boolean
  code: string
  destination: string
  error: string | null
  onCodeChange: (value: string) => void
  onContinue: () => void
  onResend: () => void
  presentation: RecoveryPresentation
  submitting: boolean
}) {
  return (
    <View className="gap-5">
      <Text
        className="text-base leading-6 text-muted-foreground"
        maxFontSizeMultiplier={1.5}
      >
        Code sent to {destination}.
      </Text>
      <OtpField
        autoFocus
        label="Six-digit code"
        onChangeText={onCodeChange}
        onSubmitEditing={onContinue}
        value={code}
      />
      <Button
        className="min-h-11 self-start px-0"
        disabled={submitting}
        onPress={onResend}
        variant="link"
      >
        <Text className="font-bold">
          {submitting ? "Sending another code" : "Resend code"}
        </Text>
      </Button>
      {error ? <RecoveryError message={error} /> : null}
      <RecoveryAction
        disabled={!canContinue}
        label={presentation.actionLabel}
        onPress={onContinue}
      />
    </View>
  )
}

export function RecoveryPasswordStep({
  canReset,
  confirmPassword,
  error,
  onConfirmPasswordChange,
  onPasswordChange,
  onReset,
  password,
  presentation,
  submitting,
}: {
  canReset: boolean
  confirmPassword: string
  error: string | null
  onConfirmPasswordChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onReset: () => void
  password: string
  presentation: RecoveryPresentation
  submitting: boolean
}) {
  const passwordsMismatch =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password !== confirmPassword

  return (
    <View className="gap-5">
      <PasswordField
        autoComplete="new-password"
        fieldSize="large"
        inputClassName="rounded-2xl bg-card"
        label="New password"
        onChangeText={onPasswordChange}
        onSubmitEditing={() => KeyboardController.setFocusTo("next")}
        returnKeyType="next"
        submitBehavior="submit"
        textContentType="newPassword"
        value={password}
      />
      <PasswordField
        autoComplete="new-password"
        fieldSize="large"
        inputClassName="rounded-2xl bg-card"
        label="Confirm new password"
        onChangeText={onConfirmPasswordChange}
        onSubmitEditing={onReset}
        returnKeyType="go"
        submitBehavior="blurAndSubmit"
        textContentType="newPassword"
        value={confirmPassword}
      />
      {passwordsMismatch ? (
        <RecoveryError message="Passwords do not match." />
      ) : null}
      {error ? <RecoveryError message={error} /> : null}
      <RecoveryAction
        busy={submitting}
        disabled={!canReset || submitting}
        label={submitting ? "Resetting password" : presentation.actionLabel}
        onPress={onReset}
      />
    </View>
  )
}

function RecoveryError({ message }: { message: string }) {
  return (
    <View
      accessibilityLiveRegion="assertive"
      className="border-l-2 border-destructive bg-destructive/10 px-3 py-2"
    >
      <Text
        accessibilityRole="alert"
        className="text-sm font-medium text-destructive"
      >
        {message}
      </Text>
    </View>
  )
}
