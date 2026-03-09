import Foundation

struct Bid: Codable, Identifiable {
    let id: String
    let cycleId: String
    let userId: String
    var amount: Double?
    let createdAt: String
    var updatedAt: String?
    var user: BidUser?
}

struct BidUser: Codable {
    let id: String
    let firstName: String
    var lastName: String?
}

struct BidResolutionResult: Codable {
    let cycle: Cycle?
    let winningBid: Bid?
    let winnerUserId: String?
    let bidFee: Double?
}
