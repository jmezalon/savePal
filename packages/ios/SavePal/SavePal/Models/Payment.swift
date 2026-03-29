import Foundation

enum PaymentStatus: String, Codable {
    case PENDING
    case PROCESSING
    case COMPLETED
    case FAILED
    case REFUNDED

    var displayName: String {
        switch self {
        case .PENDING: return "Pending"
        case .PROCESSING: return "Processing"
        case .COMPLETED: return "Completed"
        case .FAILED: return "Failed"
        case .REFUNDED: return "Refunded"
        }
    }
}

struct Payment: Codable, Identifiable {
    let id: String
    let cycleId: String
    let userId: String
    let amount: Double
    var status: PaymentStatus
    var contributionPeriod: Int
    var dueDate: String?
    var stripePaymentIntentId: String?
    var stripeChargeId: String?
    var failureReason: String?
    var retryCount: Int
    var paidAt: String?
    var fallbackMethod: String?
    var fallbackAt: String?
    var user: MemberUser?
    var cycle: PaymentCycle?
    let createdAt: String
    let updatedAt: String

    var formattedAmount: String {
        String(format: "$%.2f", amount)
    }
}

struct PaymentCycle: Codable {
    let id: String
    let cycleNumber: Int
    var group: PaymentGroup?
}

struct PaymentGroup: Codable {
    let id: String
    let name: String
}

// MARK: - Payment Breakdown

struct PaymentBreakdown: Codable {
    let contribution: Double
    let processingFee: Double
    let total: Double
}

// MARK: - Debt

struct DebtInfo: Codable {
    let outstandingDebt: Double
    let chargeAmount: Double
    let processingFee: Double
    let debtPayments: [DebtPayment]
}

struct DebtPayment: Codable, Identifiable {
    let id: String
    let amount: Double
    let createdAt: String
    let cycle: DebtPaymentCycle
}

struct DebtPaymentCycle: Codable {
    let cycleNumber: Int
}

struct DebtPaymentResult: Codable {
    let debtAmount: Double
    let chargeAmount: Double
    let paymentsResolved: Int
}

// MARK: - Payment Stats

struct PaymentStats: Codable {
    let total: Int
    let completed: Int
    let pending: Int
    let failed: Int
    let totalAmount: Double
    let paidAmount: Double
}
