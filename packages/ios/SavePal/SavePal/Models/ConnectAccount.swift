import Foundation

struct ConnectSetupResponse: Codable {
    let accountId: String
    let bankLast4: String
    let transfersStatus: String
}

struct ConnectStatus: Codable {
    let accountId: String?
    let chargesEnabled: Bool?
    let payoutsEnabled: Bool?
    let detailsSubmitted: Bool?
    let transfersStatus: String?
    let bankAccounts: [BankAccount]?
    let requirements: ConnectRequirements?
}

struct BankAccount: Codable {
    let id: String?
    let last4: String?
    let bankName: String?
    let routingNumber: String?
}

struct ConnectRequirements: Codable {
    let currentlyDue: [String]?
    let eventuallyDue: [String]?
    let pastDue: [String]?
}
