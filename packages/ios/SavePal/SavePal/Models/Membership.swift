import Foundation

enum MemberRole: String, Codable {
    case OWNER
    case ADMIN
    case MEMBER

    var displayName: String {
        switch self {
        case .OWNER: return "Owner"
        case .ADMIN: return "Admin"
        case .MEMBER: return "Member"
        }
    }
}

struct Membership: Codable, Identifiable {
    let id: String
    let groupId: String
    let userId: String
    let role: MemberRole
    let payoutPosition: Int
    let joinedAt: String
    let isActive: Bool
    var autoPaymentConsented: Bool
    var autoPaymentConsentedAt: String?
    var outstandingDebt: Double
    var debtPaymentIds: [String]
    var user: MemberUser?
}

struct MemberUser: Codable {
    let id: String
    let firstName: String
    let lastName: String
    let email: String
    var trustScore: Double
    var emailVerified: Bool
    var phoneVerified: Bool

    var fullName: String {
        "\(firstName) \(lastName)"
    }

    var initials: String {
        let first = firstName.prefix(1).uppercased()
        let last = lastName.prefix(1).uppercased()
        return "\(first)\(last)"
    }
}
