import XCTest
@testable import SavePal

final class MembershipModelTests: XCTestCase {

    private let decoder = JSONDecoder()

    func testDecodeMembershipWithAllFields() throws {
        let json = """
        {
            "id": "mem-1",
            "groupId": "group-1",
            "userId": "user-1",
            "role": "OWNER",
            "payoutPosition": 1,
            "joinedAt": "2025-01-01T00:00:00.000Z",
            "isActive": true,
            "autoPaymentConsented": true,
            "autoPaymentConsentedAt": "2025-01-02T00:00:00.000Z",
            "outstandingDebt": 0.0,
            "debtPaymentIds": [],
            "user": {
                "id": "user-1",
                "firstName": "Alice",
                "lastName": "Smith",
                "email": "alice@example.com",
                "trustScore": 85.5,
                "emailVerified": true,
                "phoneVerified": false
            }
        }
        """.data(using: .utf8)!

        let membership = try decoder.decode(Membership.self, from: json)
        XCTAssertEqual(membership.role, .OWNER)
        XCTAssertEqual(membership.payoutPosition, 1)
        XCTAssertTrue(membership.isActive)
        XCTAssertEqual(membership.user?.fullName, "Alice Smith")
        XCTAssertEqual(membership.user?.initials, "AS")
        XCTAssertEqual(membership.user?.trustScore, 85.5)
    }

    func testDecodeMembershipMinimalFields() throws {
        let json = """
        {
            "id": "mem-2",
            "groupId": "group-1",
            "userId": "user-2",
            "role": "MEMBER",
            "payoutPosition": 2,
            "joinedAt": "2025-01-05T00:00:00.000Z",
            "isActive": true
        }
        """.data(using: .utf8)!

        let membership = try decoder.decode(Membership.self, from: json)
        XCTAssertEqual(membership.role, .MEMBER)
        XCTAssertNil(membership.user)
        XCTAssertNil(membership.autoPaymentConsented)
        XCTAssertNil(membership.outstandingDebt)
        XCTAssertNil(membership.debtPaymentIds)
    }

    func testMemberRoleDisplayNames() {
        XCTAssertEqual(MemberRole.OWNER.displayName, "Owner")
        XCTAssertEqual(MemberRole.ADMIN.displayName, "Admin")
        XCTAssertEqual(MemberRole.MEMBER.displayName, "Member")
    }

    func testMemberUserInitials() throws {
        let json = """
        {
            "id": "user-1",
            "firstName": "john",
            "lastName": "doe"
        }
        """.data(using: .utf8)!

        let user = try decoder.decode(MemberUser.self, from: json)
        XCTAssertEqual(user.initials, "JD", "Initials should be uppercased")
        XCTAssertEqual(user.fullName, "john doe")
    }

    // MARK: - Reorder logic test

    func testReorderMembershipPositionSwap() throws {
        // Simulate the moveMember logic from GroupDetailView
        let mem1 = Membership(
            id: "m1", groupId: "g1", userId: "u1", role: .OWNER,
            payoutPosition: 1, joinedAt: "2025-01-01", isActive: true
        )
        let mem2 = Membership(
            id: "m2", groupId: "g1", userId: "u2", role: .MEMBER,
            payoutPosition: 2, joinedAt: "2025-01-02", isActive: true
        )
        let mem3 = Membership(
            id: "m3", groupId: "g1", userId: "u3", role: .MEMBER,
            payoutPosition: 3, joinedAt: "2025-01-03", isActive: true
        )

        var list = [mem1, mem2, mem3]

        // Swap index 0 (position 1) with index 1 (position 2) — move mem1 down
        let index = 0
        let swapIndex = 1
        let tempPos = list[index].payoutPosition

        list[index] = Membership(
            id: list[index].id, groupId: list[index].groupId, userId: list[index].userId,
            role: list[index].role, payoutPosition: list[swapIndex].payoutPosition,
            joinedAt: list[index].joinedAt, isActive: list[index].isActive
        )
        list[swapIndex] = Membership(
            id: list[swapIndex].id, groupId: list[swapIndex].groupId, userId: list[swapIndex].userId,
            role: list[swapIndex].role, payoutPosition: tempPos,
            joinedAt: list[swapIndex].joinedAt, isActive: list[swapIndex].isActive
        )
        list.sort { $0.payoutPosition < $1.payoutPosition }

        XCTAssertEqual(list[0].userId, "u2", "u2 should now be in position 1")
        XCTAssertEqual(list[0].payoutPosition, 1)
        XCTAssertEqual(list[1].userId, "u1", "u1 should now be in position 2")
        XCTAssertEqual(list[1].payoutPosition, 2)
        XCTAssertEqual(list[2].userId, "u3", "u3 should remain in position 3")
        XCTAssertEqual(list[2].payoutPosition, 3)
    }
}
