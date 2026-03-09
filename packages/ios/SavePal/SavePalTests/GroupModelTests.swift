import XCTest
@testable import SavePal

final class GroupModelTests: XCTestCase {

    private let decoder = JSONDecoder()

    func testPayoutMethodDecoding() throws {
        let sequential = "\"SEQUENTIAL\"".data(using: .utf8)!
        let random = "\"RANDOM\"".data(using: .utf8)!
        let bidding = "\"BIDDING\"".data(using: .utf8)!

        XCTAssertEqual(try decoder.decode(PayoutMethod.self, from: sequential), .SEQUENTIAL)
        XCTAssertEqual(try decoder.decode(PayoutMethod.self, from: random), .RANDOM)
        XCTAssertEqual(try decoder.decode(PayoutMethod.self, from: bidding), .BIDDING)
    }

    func testPayoutMethodDisplayNames() {
        XCTAssertEqual(PayoutMethod.SEQUENTIAL.displayName, "Sequential")
        XCTAssertEqual(PayoutMethod.RANDOM.displayName, "Random")
        XCTAssertEqual(PayoutMethod.BIDDING.displayName, "Bidding")
    }

    func testDecodeGroupWithBiddingMethod() throws {
        let json = """
        {
            "id": "group-1",
            "name": "Test Bidding Group",
            "contributionAmount": 100.0,
            "frequency": "WEEKLY",
            "payoutMethod": "BIDDING",
            "status": "ACTIVE",
            "maxMembers": 5,
            "currentMembers": 5,
            "inviteCode": "ABC123",
            "createdById": "user-1",
            "createdAt": "2025-01-01T00:00:00.000Z",
            "updatedAt": "2025-01-01T00:00:00.000Z"
        }
        """.data(using: .utf8)!

        let group = try decoder.decode(SavingsGroup.self, from: json)
        XCTAssertEqual(group.payoutMethod, .BIDDING)
        XCTAssertEqual(group.status, .ACTIVE)
        XCTAssertTrue(group.isFull)
        XCTAssertEqual(group.formattedContribution, "$100.00")
    }

    func testGroupIsFullLogic() throws {
        let json = """
        {
            "id": "group-2",
            "name": "Not Full Group",
            "contributionAmount": 50.0,
            "frequency": "MONTHLY",
            "payoutMethod": "SEQUENTIAL",
            "status": "PENDING",
            "maxMembers": 5,
            "currentMembers": 3,
            "inviteCode": "DEF456",
            "createdById": "user-1",
            "createdAt": "2025-01-01T00:00:00.000Z",
            "updatedAt": "2025-01-01T00:00:00.000Z"
        }
        """.data(using: .utf8)!

        let group = try decoder.decode(SavingsGroup.self, from: json)
        XCTAssertFalse(group.isFull)
    }

    // MARK: - API Endpoints

    func testBidEndpoints() {
        let cycleId = "cycle-123"
        XCTAssertTrue(APIEndpoints.Cycles.bids(cycleId).hasSuffix("/cycles/cycle-123/bids"))
        XCTAssertTrue(APIEndpoints.Cycles.resolveBids(cycleId).hasSuffix("/cycles/cycle-123/bids/resolve"))
        XCTAssertTrue(APIEndpoints.Cycles.eligibleBidders(cycleId).hasSuffix("/cycles/cycle-123/bids/eligible"))
    }

    func testReorderEndpoint() {
        let groupId = "group-456"
        XCTAssertTrue(APIEndpoints.Groups.reorder(groupId).hasSuffix("/groups/group-456/reorder"))
    }
}
