import XCTest
@testable import SavePal

final class CycleModelTests: XCTestCase {

    private let decoder = JSONDecoder()

    // MARK: - BiddingStatus

    func testBiddingStatusDecoding() throws {
        let openJson = "\"OPEN\"".data(using: .utf8)!
        let closedJson = "\"CLOSED\"".data(using: .utf8)!

        XCTAssertEqual(try decoder.decode(BiddingStatus.self, from: openJson), .OPEN)
        XCTAssertEqual(try decoder.decode(BiddingStatus.self, from: closedJson), .CLOSED)
    }

    // MARK: - Cycle with optional recipientId and biddingStatus

    func testDecodeCycleWithBiddingOpen() throws {
        let json = """
        {
            "id": "cycle-1",
            "groupId": "group-1",
            "cycleNumber": 1,
            "recipientId": null,
            "dueDate": "2025-02-01T00:00:00.000Z",
            "totalAmount": 500.0,
            "isCompleted": false,
            "biddingStatus": "OPEN",
            "createdAt": "2025-01-01T00:00:00.000Z",
            "updatedAt": "2025-01-01T00:00:00.000Z"
        }
        """.data(using: .utf8)!

        let cycle = try decoder.decode(Cycle.self, from: json)
        XCTAssertEqual(cycle.id, "cycle-1")
        XCTAssertNil(cycle.recipientId, "Bidding cycles should have null recipientId initially")
        XCTAssertEqual(cycle.biddingStatus, .OPEN)
        XCTAssertFalse(cycle.isCompleted)
    }

    func testDecodeCycleWithBiddingClosed() throws {
        let json = """
        {
            "id": "cycle-2",
            "groupId": "group-1",
            "cycleNumber": 2,
            "recipientId": "user-winner",
            "dueDate": "2025-03-01T00:00:00.000Z",
            "totalAmount": 500.0,
            "isCompleted": false,
            "biddingStatus": "CLOSED",
            "createdAt": "2025-02-01T00:00:00.000Z",
            "updatedAt": "2025-02-15T00:00:00.000Z"
        }
        """.data(using: .utf8)!

        let cycle = try decoder.decode(Cycle.self, from: json)
        XCTAssertEqual(cycle.recipientId, "user-winner")
        XCTAssertEqual(cycle.biddingStatus, .CLOSED)
    }

    func testDecodeCycleWithoutBidding() throws {
        let json = """
        {
            "id": "cycle-3",
            "groupId": "group-2",
            "cycleNumber": 1,
            "recipientId": "user-1",
            "dueDate": "2025-02-01T00:00:00.000Z",
            "totalAmount": 300.0,
            "isCompleted": false,
            "createdAt": "2025-01-01T00:00:00.000Z",
            "updatedAt": "2025-01-01T00:00:00.000Z"
        }
        """.data(using: .utf8)!

        let cycle = try decoder.decode(Cycle.self, from: json)
        XCTAssertEqual(cycle.recipientId, "user-1")
        XCTAssertNil(cycle.biddingStatus, "Non-bidding cycles should have nil biddingStatus")
    }

    func testDecodeCycleWithPayments() throws {
        let json = """
        {
            "id": "cycle-4",
            "groupId": "group-1",
            "cycleNumber": 1,
            "recipientId": "user-1",
            "dueDate": "2025-02-01T00:00:00.000Z",
            "totalAmount": 500.0,
            "isCompleted": false,
            "payments": [
                {
                    "id": "pay-1",
                    "cycleId": "cycle-4",
                    "userId": "user-2",
                    "amount": 100.0,
                    "status": "PENDING",
                    "contributionPeriod": 1,
                    "retryCount": 0,
                    "createdAt": "2025-01-01T00:00:00.000Z",
                    "updatedAt": "2025-01-01T00:00:00.000Z"
                }
            ],
            "createdAt": "2025-01-01T00:00:00.000Z",
            "updatedAt": "2025-01-01T00:00:00.000Z"
        }
        """.data(using: .utf8)!

        let cycle = try decoder.decode(Cycle.self, from: json)
        XCTAssertEqual(cycle.payments?.count, 1)
        XCTAssertEqual(cycle.payments?.first?.status, .PENDING)
    }
}
