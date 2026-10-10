export function StoreSubscriptionCancellationHelp() {
  return (
    <section
      aria-label="Cancel a mobile app subscription"
      className="mt-8 rounded-xl border p-5 text-sm leading-6"
    >
      <h2 className="font-semibold">Cancel a mobile app subscription</h2>
      <p className="mt-2 text-muted-foreground">
        If you bought app access, use the Apple or Google account that paid for
        it. Deleting your HalaalVest account does not stop store renewals.
      </p>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
        <a
          className="inline-flex min-h-11 items-center underline underline-offset-4"
          href="https://support.apple.com/en-us/118428"
          rel="noopener noreferrer"
          target="_blank"
        >
          Apple cancellation steps
        </a>
        <a
          className="inline-flex min-h-11 items-center underline underline-offset-4"
          href="https://support.google.com/googleplay/answer/7018481"
          rel="noopener noreferrer"
          target="_blank"
        >
          Google Play cancellation steps
        </a>
      </div>
    </section>
  )
}
