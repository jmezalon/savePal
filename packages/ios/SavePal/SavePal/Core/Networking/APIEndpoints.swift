import Foundation

enum APIEndpoints {
    #if DEBUG
    static let baseURL = "https://savepal-backend-dev.onrender.com/api"
    #else
    static let baseURL = "https://savepal.onrender.com/api"
    #endif

    // MARK: - Auth
    enum Auth {
        static let register = "\(baseURL)/auth/register"
        static let login = "\(baseURL)/auth/login"
        static let google = "\(baseURL)/auth/google"
        static let forgotPassword = "\(baseURL)/auth/forgot-password"
        static let resetPassword = "\(baseURL)/auth/reset-password"
        static func verifyEmail(_ token: String) -> String { "\(baseURL)/auth/verify-email/\(token)" }
        static let resendVerification = "\(baseURL)/auth/resend-verification"
        static let me = "\(baseURL)/auth/me"
        static let logout = "\(baseURL)/auth/logout"
        static let profile = "\(baseURL)/auth/profile"
        static let notifications = "\(baseURL)/auth/notifications"
        static let changePassword = "\(baseURL)/auth/change-password"
        static let sendPhoneVerification = "\(baseURL)/auth/send-phone-verification"
        static let verifyPhone = "\(baseURL)/auth/verify-phone"
        static let deleteAccount = "\(baseURL)/auth/delete-account"
        static let apple = "\(baseURL)/auth/apple"
    }

    // MARK: - Groups
    enum Groups {
        static let base = "\(baseURL)/groups"
        static let creationFeeStatus = "\(base)/creation-fee-status"
        static let validateWaiverCode = "\(base)/validate-waiver-code"
        static let join = "\(base)/join"
        static func detail(_ id: String) -> String { "\(base)/\(id)" }
        static func readiness(_ id: String) -> String { "\(base)/\(id)/readiness" }
        static func start(_ id: String) -> String { "\(base)/\(id)/start" }
        static func reorder(_ id: String) -> String { "\(base)/\(id)/reorder" }
        static func cycles(_ groupId: String) -> String { "\(base)/\(groupId)/cycles" }
        static func currentCycle(_ groupId: String) -> String { "\(base)/\(groupId)/cycles/current" }
        static func payouts(_ groupId: String) -> String { "\(base)/\(groupId)/payouts" }
    }

    // MARK: - Cycles
    enum Cycles {
        static let base = "\(baseURL)/cycles"
        static func detail(_ id: String) -> String { "\(base)/\(id)" }
        static func myPayments(_ cycleId: String) -> String { "\(base)/\(cycleId)/my-payments" }
        static func myPayment(_ cycleId: String) -> String { "\(base)/\(cycleId)/my-payment" }
        static func payments(_ cycleId: String) -> String { "\(base)/\(cycleId)/payments" }
        static func payout(_ cycleId: String) -> String { "\(base)/\(cycleId)/payout" }
        static func complete(_ cycleId: String) -> String { "\(base)/\(cycleId)/complete" }
        static func bids(_ cycleId: String) -> String { "\(base)/\(cycleId)/bids" }
        static func resolveBids(_ cycleId: String) -> String { "\(base)/\(cycleId)/bids/resolve" }
        static func eligibleBidders(_ cycleId: String) -> String { "\(base)/\(cycleId)/bids/eligible" }
    }

    // MARK: - Payments
    enum Payments {
        static let base = "\(baseURL)/payments"
        static let myPayments = "\(base)/my-payments"
        static let pending = "\(base)/my-payments/pending"
        static let overdue = "\(base)/my-payments/overdue"
        static let myStats = "\(base)/my-stats"
        static func detail(_ id: String) -> String { "\(base)/\(id)" }
        static func breakdown(_ id: String) -> String { "\(base)/\(id)/breakdown" }
        static func process(_ id: String) -> String { "\(base)/\(id)/process" }
    }

    // MARK: - Payouts
    enum Payouts {
        static let base = "\(baseURL)/payouts"
        static let myPayouts = "\(base)/my-payouts"
        static let pending = "\(base)/my-payouts/pending"
        static let myStats = "\(base)/my-stats"
        static func detail(_ id: String) -> String { "\(base)/\(id)" }
        static func retry(_ id: String) -> String { "\(base)/\(id)/retry" }
    }

    // MARK: - Notifications
    enum Notifications {
        static let base = "\(baseURL)/notifications"
        static let unread = "\(base)/unread"
        static let unreadCount = "\(base)/unread/count"
        static let readAll = "\(base)/read-all"
        static func read(_ id: String) -> String { "\(base)/\(id)/read" }
        static func delete(_ id: String) -> String { "\(base)/\(id)" }
        static let deviceToken = "\(base)/device-token"
    }

    // MARK: - Payment Methods
    enum PaymentMethods {
        static let base = "\(baseURL)/payment-methods"
        static let config = "\(base)/config"
        static let setupIntent = "\(base)/setup-intent"
        static func detail(_ id: String) -> String { "\(base)/\(id)" }
        static func setDefault(_ id: String) -> String { "\(base)/\(id)/default" }
    }

    // MARK: - Stripe Connect
    enum Connect {
        static let base = "\(baseURL)/connect"
        static let setup = "\(base)/setup"
        static let verifyIdentity = "\(base)/verify-identity"
        static let status = "\(base)/status"
        static let bankAccount = "\(base)/bank-account"
    }
}
