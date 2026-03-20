import Foundation

enum NotificationType: String, Codable {
    case PAYMENT_DUE
    case PAYMENT_RECEIVED
    case PAYOUT_PENDING
    case PAYOUT_COMPLETED
    case PAYOUT_FAILED
    case GROUP_INVITE
    case GROUP_STARTED
    case GROUP_COMPLETED
    case PAYMENT_FAILED
    case CONNECT_ONBOARDING_REQUIRED
    case REMINDER
    case AUTO_PAYMENT_SCHEDULED
    case AUTO_PAYMENT_PROCESSED
    case DEBT_RECORDED
    case DEBT_DEDUCTED_FROM_PAYOUT
    case PAYMENT_DISPUTED
    case BANK_ACCOUNT_UPDATED
}

struct AppNotification: Codable, Identifiable {
    let id: String
    let userId: String
    var groupId: String?
    let type: NotificationType
    let title: String
    let message: String
    var isRead: Bool
    let sentAt: String
    let createdAt: String
    var group: NotificationGroup?
}

struct NotificationGroup: Codable {
    let id: String
    let name: String
}

struct UnreadCount: Codable {
    let count: Int
}
