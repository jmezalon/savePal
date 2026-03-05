import Foundation

struct Payout: Codable, Identifiable {
    let id: String
    let cycleId: String
    let recipientId: String
    let amount: Double
    let feeAmount: Double
    let netAmount: Double
    var status: PaymentStatus
    var stripeTransferId: String?
    var transferredAt: String?
    var failureReason: String?
    var retryCount: Int
    var lastRetryAt: String?
    var cycle: PayoutCycle?
    var recipient: MemberUser?
    let createdAt: String
    let updatedAt: String

    var formattedNetAmount: String {
        String(format: "$%.2f", netAmount)
    }
}

struct PayoutCycle: Codable {
    let id: String
    let cycleNumber: Int
    var group: PaymentGroup?
}

// MARK: - Payout Stats

struct PayoutStats: Codable {
    let total: Int
    let completed: Int
    let pending: Int
    let failed: Int
    let totalAmount: Double
    let totalNetAmount: Double
    let totalFees: Double
    let receivedAmount: Double
}
