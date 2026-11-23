import Foundation

enum ReceiptShareFile {
  static let lifetime: TimeInterval = 15 * 60
  private static let maxBytes = 10 * 1024 * 1024

  struct Format {
    let suffix: String
    let mimeType: String
    let size: Int
  }

  static func format(of url: URL) throws -> Format {
    let values = try url.resourceValues(forKeys: [.fileSizeKey, .isRegularFileKey])
    guard values.isRegularFile == true, let size = values.fileSize, (1...maxBytes).contains(size) else {
      throw CocoaError(.fileReadCorruptFile)
    }
    let reader = try FileHandle(forReadingFrom: url)
    defer { try? reader.close() }
    let header = Array(try reader.read(upToCount: 8) ?? Data())
    if header.starts(with: [0x25, 0x50, 0x44, 0x46, 0x2D]) {
      return Format(suffix: "pdf", mimeType: "application/pdf", size: size)
    }
    if header.starts(with: [0xFF, 0xD8, 0xFF]) {
      return Format(suffix: "jpg", mimeType: "image/jpeg", size: size)
    }
    if header.starts(with: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) {
      return Format(suffix: "png", mimeType: "image/png", size: size)
    }
    throw CocoaError(.fileReadCorruptFile)
  }

  static func cache(in root: URL) throws -> URL {
    let directory = root.appendingPathComponent("receipt-share", isDirectory: true)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    return directory
  }

  static func purgeExpired(in directory: URL) {
    let manager = FileManager.default
    let files = try? manager.contentsOfDirectory(
      at: directory, includingPropertiesForKeys: [.contentModificationDateKey]
    )
    for file in files ?? [] {
      let date = try? file.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate
      if let date, Date().timeIntervalSince(date) >= lifetime {
        try? manager.removeItem(at: file)
      }
    }
  }
}
