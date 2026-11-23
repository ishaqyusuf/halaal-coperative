import UIKit
import UniformTypeIdentifiers

final class ReceiptShareViewController: UIViewController {
  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .systemBackground
    let spinner = UIActivityIndicatorView(style: .large)
    spinner.translatesAutoresizingMaskIntoConstraints = false
    spinner.accessibilityLabel = "Preparing receipt"
    view.addSubview(spinner)
    NSLayoutConstraint.activate([
      spinner.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      spinner.centerYAnchor.constraint(equalTo: view.centerYAnchor),
    ])
    spinner.startAnimating()

    let identifiers = [UTType.pdf.identifier, UTType.jpeg.identifier, UTType.png.identifier]
    let items = extensionContext?.inputItems as? [NSExtensionItem] ?? []
    let matches = items.flatMap { $0.attachments ?? [] }.compactMap { provider in
      identifiers.first(where: provider.hasItemConformingToTypeIdentifier).map { (provider, $0) }
    }
    guard matches.count == 1, let (provider, identifier) = matches.first else {
      showResult(saved: false)
      return
    }

    provider.loadFileRepresentation(forTypeIdentifier: identifier) { url, _ in
      let saved = url.map { (try? Self.saveReceipt($0)) != nil } ?? false
      DispatchQueue.main.async { self.showResult(saved: saved) }
    }
  }

  nonisolated private static func saveReceipt(_ source: URL) throws {
    _ = try ReceiptShareFile.format(of: source)
    let manager = FileManager.default
    guard let group = Bundle.main.object(forInfoDictionaryKey: "ReceiptShareGroup") as? String,
          let container = manager.containerURL(forSecurityApplicationGroupIdentifier: group) else {
      throw CocoaError(.fileWriteNoPermission)
    }
    let directory = try ReceiptShareFile.cache(in: container.appendingPathComponent("Library/Caches"))
    // Atomic and protected, so the host only sees a complete receipt.
    try Data(contentsOf: source).write(
      to: directory.appendingPathComponent("pending"), options: [.atomic, .completeFileProtection]
    )
  }

  private func showResult(saved: Bool) {
    let alert = UIAlertController(
      title: saved ? "Receipt ready" : "Couldn’t import receipt",
      message: saved
        ? "Open HalaalVest to choose what this receipt is for."
        : "Share one JPG, PNG or PDF up to 10 MB.",
      preferredStyle: .alert
    )
    alert.addAction(UIAlertAction(title: "Done", style: .default) { _ in
      self.extensionContext?.completeRequest(returningItems: nil)
    })
    if view.window != nil {
      present(alert, animated: true)
    } else {
      pendingAlert = alert
    }
  }

  private var pendingAlert: UIAlertController?

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    if let alert = pendingAlert {
      pendingAlert = nil
      present(alert, animated: true)
    }
  }
}
