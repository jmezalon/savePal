import Foundation

struct Cycle: Codable, Identifiable {
    let id: String
    let groupId: String
    let cycleNumber: Int
    let recipientId: String
    let dueDate: String
    var completedDate: String?
    let totalAmount: Double
    var isCompleted: Bool
    var payments: [Payment]?
    var payout: Payout?
    var group: SavingsGroup?
    let createdAt: String
    let updatedAt: String
}
