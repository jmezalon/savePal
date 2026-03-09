import Foundation

enum BiddingStatus: String, Codable {
    case OPEN
    case CLOSED
}

struct Cycle: Codable, Identifiable {
    let id: String
    let groupId: String
    let cycleNumber: Int
    var recipientId: String?
    let dueDate: String
    var completedDate: String?
    let totalAmount: Double
    var isCompleted: Bool
    var biddingStatus: BiddingStatus?
    var payments: [Payment]?
    var payout: Payout?
    var group: SavingsGroup?
    let createdAt: String
    let updatedAt: String
}
