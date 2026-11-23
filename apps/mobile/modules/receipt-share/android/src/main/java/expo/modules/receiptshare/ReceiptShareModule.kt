package expo.modules.receiptshare

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ReceiptShareModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ReceiptShare")
    Events("onReceiptShared")

    OnNewIntent { intent ->
      if (intent.action == ReceiptShareStore.OPEN_ACTION) sendEvent("onReceiptShared")
    }

    AsyncFunction("take") {
      appContext.reactContext?.let { ReceiptShareStore.take(it) }
    }
  }
}
