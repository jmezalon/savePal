import Foundation

// MARK: - Enums

enum Frequency: String, Codable, CaseIterable {
    case WEEKLY
    case BIWEEKLY
    case MONTHLY

    var displayName: String {
        switch self {
        case .WEEKLY: return "Weekly"
        case .BIWEEKLY: return "Biweekly"
        case .MONTHLY: return "Monthly"
        }
    }
}

enum PayoutMethod: String, Codable, CaseIterable {
    case SEQUENTIAL
    case RANDOM
    case BIDDING

    var displayName: String {
        switch self {
        case .SEQUENTIAL: return "Sequential"
        case .RANDOM: return "Random"
        case .BIDDING: return "Bidding"
        }
    }

    var description: String {
        switch self {
        case .SEQUENTIAL: return "Members receive payouts in order of joining"
        case .RANDOM: return "Payout order is randomly assigned"
        case .BIDDING: return "Members bid for payout positions"
        }
    }
}

enum GroupStatus: String, Codable {
    case PENDING
    case ACTIVE
    case COMPLETED
    case CANCELLED

    var displayName: String {
        switch self {
        case .PENDING: return "Pending"
        case .ACTIVE: return "Active"
        case .COMPLETED: return "Completed"
        case .CANCELLED: return "Cancelled"
        }
    }
}

// MARK: - SavingsGroup

struct SavingsGroup: Codable, Identifiable {
    let id: String
    let name: String
    var description: String?
    let contributionAmount: Double
    let frequency: Frequency
    var payoutFrequency: Frequency?
    let payoutMethod: PayoutMethod
    var status: GroupStatus
    let maxMembers: Int
    var currentMembers: Int
    var startDate: String?
    var endDate: String?
    let inviteCode: String
    let createdById: String
    var createdBy: GroupCreator?
    var memberships: [Membership]?
    var userRole: String?
    let createdAt: String
    let updatedAt: String

    var isFull: Bool {
        currentMembers >= maxMembers
    }

    var effectivePayoutFrequency: Frequency {
        payoutFrequency ?? frequency
    }

    var formattedContribution: String {
        String(format: "$%.2f", contributionAmount)
    }
}

struct GroupCreator: Codable {
    let id: String
    let firstName: String
    let lastName: String
    var email: String?
}

// MARK: - Group Readiness

struct GroupReadiness: Codable {
    let ready: Bool
    let membersWithoutPaymentMethod: [MemberName]
    let membersWithoutVerification: [MemberName]
}

struct MemberName: Codable {
    let firstName: String
    let lastName: String
}

// MARK: - Creation Fee Status

struct CreationFeeStatus: Codable {
    let feeRequired: Bool
    var reason: String?
}

struct WaiverCodeValidation: Codable {
    let valid: Bool
    let message: String
}
