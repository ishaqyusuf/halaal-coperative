import ExpoModulesCore
import Foundation

public class ReceiptShareModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ReceiptShare")
    Events("onReceiptShared")

    AsyncFunction("take") { () -> [String: Any]? in
      let manager = FileManager.default
      guard let group = Bundle.main.object(forInfoDictionaryKey: "ReceiptShareGroup") as? String,
            let container = manager.containerURL(forSecurityApplicationGroupIdentifier: group),
            let caches = manager.urls(for: .cachesDirectory, in: .userDomainMask).first else {
        return nil
      }
      let inbox = try ReceiptShareFile.cache(in: container.appendingPathComponent("Library/Caches"))
      let destination = try ReceiptShareFile.cache(in: caches)
      ReceiptShareFile.purgeExpired(in: destination)

      let pending = inbox.appendingPathComponent("pending")
      let id = UUID().uuidString
      let file = destination.appendingPathComponent(id)
      // Claim the staged file so a later share can use the same inbox slot.
      do {
        try manager.moveItem(at: pending, to: file)
      } catch CocoaError.fileNoSuchFile {
        return nil
      } catch CocoaError.fileReadNoSuchFile {
        return nil
      }

      do {
        let date = try file.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate ?? .distantPast
        let expires = date.addingTimeInterval(ReceiptShareFile.lifetime)
        guard expires > Date() else {
          try? manager.removeItem(at: file)
          return nil
        }
        let info = try ReceiptShareFile.format(of: file)
        return [
          "id": id,
          "uri": file.absoluteString,
          "fileName": "Shared receipt.\(info.suffix)",
          "contentType": info.mimeType,
          "size": info.size,
          "expiresAt": expires.timeIntervalSince1970 * 1000,
        ]
      } catch {
        try? manager.removeItem(at: file)
        return nil
      }
    }
  }
}
