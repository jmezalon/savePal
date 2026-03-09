import XCTest
@testable import SavePal

final class BidModelTests: XCTestCase {

    private let decoder = JSONDecoder()

    // MARK: - Bid Decoding

    func testDecodeBidWithAllFields() throws {
        let json = """
        {
            "id": "bid-1",
            "cycleId": "cycle-1",
            "userId": "user-1",
            "amount": 25.50,
            "createdAt": "2025-01-15T10:00:00.000Z",
            "updatedAt": "2025-01-15T12:00:00.000Z",
            "user": {
                "id": "user-1",
                "firstName": "John",
                "lastName": "Doe"
            }
        }
        """.data(using: .utf8)!

        let bid = try decoder.decode(Bid.self, from: json)
        XCTAssertEqual(bid.id, "bid-1")
        XCTAssertEqual(bid.cycleId, "cycle-1")
        XCTAssertEqual(bid.userId, "user-1")
        XCTAssertEqual(bid.amount, 25.50)
        XCTAssertEqual(bid.user?.firstName, "John")
        XCTAssertEqual(bid.user?.lastName, "Doe")
        XCTAssertNotNil(bid.updatedAt)
    }

    func testDecodeBidWithNullOptionals() throws {
        let json = """
        {
            "id": "bid-2",
            "cycleId": "cycle-1",
            "userId": "user-2",
            "createdAt": "2025-01-15T10:00:00.000Z"
        }
        """.data(using: .utf8)!

        let bid = try decoder.decode(Bid.self, from: json)
        XCTAssertEqual(bid.id, "bid-2")
        XCTAssertNil(bid.amount, "Amount should be nil when not provided (hidden for non-owners)")
        XCTAssertNil(bid.user)
        XCTAssertNil(bid.updatedAt)
    }

    func testDecodeBidUserWithOptionalLastName() throws {
        let json = """
        {
            "id": "user-1",
            "firstName": "Jane"
        }
        """.data(using: .utf8)!

        let user = try decoder.decode(BidUser.self, from: json)
        XCTAssertEqual(user.firstName, "Jane")
        XCTAssertNil(user.lastName)
    }

    // MARK: - BidResolutionResult Decoding

    func testDecodeBidResolutionResult() throws {
        let json = """
        {
            "cycle": {
                "id": "cycle-1",
                "groupId": "group-1",
                "cycleNumber": 1,
                "recipientId": "user-1",
                "dueDate": "2025-02-01T00:00:00.000Z",
                "totalAmount": 500.0,
                "isCompleted": false,
                "biddingStatus": "CLOSED",
                "createdAt": "2025-01-01T00:00:00.000Z",
                "updatedAt": "2025-01-15T00:00:00.000Z"
            },
            "winningBid": {
                "id": "bid-1",
                "cycleId": "cycle-1",
                "userId": "user-1",
                "amount": 50.0,
                "createdAt": "2025-01-10T00:00:00.000Z"
            },
            "winnerUserId": "user-1",
            "bidFee": 50.0
        }
        """.data(using: .utf8)!

        let result = try decoder.decode(BidResolutionResult.self, from: json)
        XCTAssertNotNil(result.cycle)
        XCTAssertEqual(result.cycle?.biddingStatus, .CLOSED)
        XCTAssertEqual(result.cycle?.recipientId, "user-1")
        XCTAssertEqual(result.winnerUserId, "user-1")
        XCTAssertEqual(result.bidFee, 50.0)
        XCTAssertEqual(result.winningBid?.amount, 50.0)
    }

    func testDecodeBidResolutionWithNulls() throws {
        let json = """
        {
            "cycle": null,
            "winningBid": null,
            "winnerUserId": null,
            "bidFee": null
        }
        """.data(using: .utf8)!

        let result = try decoder.decode(BidResolutionResult.self, from: json)
        XCTAssertNil(result.cycle)
        XCTAssertNil(result.winningBid)
        XCTAssertNil(result.winnerUserId)
        XCTAssertNil(result.bidFee)
    }
}
