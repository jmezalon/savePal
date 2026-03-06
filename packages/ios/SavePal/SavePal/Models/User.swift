import Foundation

// MARK: - Enums

enum SystemRole: String, Codable {
    case USER
    case SUPERADMIN
}

// MARK: - User

struct User: Codable, Identifiable {
    let id: String
    let email: String
    let firstName: String
    let lastName: String
    var googleId: String?
    var appleId: String?
    var phoneNumber: String?
    var emailVerified: Bool
    var phoneVerified: Bool
    var trustScore: Double
    var role: SystemRole
    var emailNotifications: Bool
    var smsNotifications: Bool
    var pushNotifications: Bool
    var stripeCustomerId: String?
    var stripeConnectAccountId: String?
    var stripeConnectOnboarded: Bool
    let createdAt: String
    let updatedAt: String

    var fullName: String {
        "\(firstName) \(lastName)"
    }

    var initials: String {
        let first = firstName.prefix(1).uppercased()
        let last = lastName.prefix(1).uppercased()
        return "\(first)\(last)"
    }
}

// MARK: - User Stats (from /me endpoint)

struct UserStats: Codable {
    let totalSaved: Double
    let activeGroups: Int
    let completedGroups: Int
}

struct UserWithStats: Codable, Identifiable {
    let id: String
    let email: String
    let firstName: String
    let lastName: String
    var googleId: String?
    var appleId: String?
    var phoneNumber: String?
    var emailVerified: Bool
    var phoneVerified: Bool
    var trustScore: Double
    var role: SystemRole
    var emailNotifications: Bool
    var smsNotifications: Bool
    var pushNotifications: Bool
    var stripeCustomerId: String?
    var stripeConnectAccountId: String?
    var stripeConnectOnboarded: Bool
    let createdAt: String
    let updatedAt: String
    let stats: UserStats

    var user: User {
        User(
            id: id, email: email, firstName: firstName, lastName: lastName,
            googleId: googleId, appleId: appleId, phoneNumber: phoneNumber,
            emailVerified: emailVerified, phoneVerified: phoneVerified,
            trustScore: trustScore, role: role,
            emailNotifications: emailNotifications,
            smsNotifications: smsNotifications,
            pushNotifications: pushNotifications,
            stripeCustomerId: stripeCustomerId,
            stripeConnectAccountId: stripeConnectAccountId,
            stripeConnectOnboarded: stripeConnectOnboarded,
            createdAt: createdAt, updatedAt: updatedAt
        )
    }
}
