import Foundation

extension String {
    /// Parse ISO 8601 date string from the API
    var toDate: Date? {
        let formatters: [ISO8601DateFormatter] = {
            let full = ISO8601DateFormatter()
            full.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

            let basic = ISO8601DateFormatter()
            basic.formatOptions = [.withInternetDateTime]

            return [full, basic]
        }()

        for formatter in formatters {
            if let date = formatter.date(from: self) {
                return date
            }
        }
        return nil
    }

    var relativeDate: String {
        guard let date = self.toDate else { return self }
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: date, relativeTo: Date())
    }

    var formattedDate: String {
        guard let date = self.toDate else { return self }
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: date)
    }

    var formattedDateTime: String {
        guard let date = self.toDate else { return self }
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

extension Double {
    var formattedCurrency: String {
        String(format: "$%.2f", self)
    }
}
