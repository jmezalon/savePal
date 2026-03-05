import Foundation
import SwiftUI

@Observable
final class AuthManager {
    static let shared = AuthManager()

    var currentUser: User?
    var userStats: UserStats?
    var isAuthenticated = false
    var isLoading = true
    var error: String?

    private init() {}

    // MARK: - Session

    @MainActor
    func checkAuth() async {
        guard KeychainHelper.getToken() != nil else {
            isLoading = false
            return
        }
        do {
            let userWithStats: UserWithStats = try await APIClient.shared.request(
                url: APIEndpoints.Auth.me
            )
            self.currentUser = userWithStats.user
            self.userStats = userWithStats.stats
            self.isAuthenticated = true
        } catch {
            // Token invalid or expired
            KeychainHelper.deleteToken()
            self.isAuthenticated = false
        }
        isLoading = false
    }

    // MARK: - Register

    @MainActor
    func register(email: String, password: String, firstName: String, lastName: String, phoneNumber: String?) async throws {
        var body: [String: Any] = [
            "email": email,
            "password": password,
            "firstName": firstName,
            "lastName": lastName,
        ]
        if let phone = phoneNumber, !phone.isEmpty {
            body["phoneNumber"] = phone
        }

        let authResponse: AuthResponse = try await APIClient.shared.request(
            url: APIEndpoints.Auth.register,
            method: "POST",
            body: body,
            authenticated: false
        )
        KeychainHelper.saveToken(authResponse.token)
        self.currentUser = authResponse.user
        self.isAuthenticated = true
    }

    // MARK: - Login

    @MainActor
    func login(email: String, password: String) async throws {
        let authResponse: AuthResponse = try await APIClient.shared.request(
            url: APIEndpoints.Auth.login,
            method: "POST",
            body: ["email": email, "password": password],
            authenticated: false
        )
        KeychainHelper.saveToken(authResponse.token)
        self.currentUser = authResponse.user
        self.isAuthenticated = true

        // Fetch stats in background
        await fetchUserStats()
    }

    // MARK: - Logout

    @MainActor
    func logout() {
        KeychainHelper.deleteToken()
        currentUser = nil
        userStats = nil
        isAuthenticated = false
        error = nil
    }

    // MARK: - Delete Account

    @MainActor
    func deleteAccount() async throws {
        _ = try await APIClient.shared.requestMessage(
            url: APIEndpoints.Auth.deleteAccount,
            method: "DELETE"
        )
        logout()
    }

    // MARK: - Unauthorized Handler

    @MainActor
    func handleUnauthorized() {
        logout()
    }

    // MARK: - Refresh User

    @MainActor
    func refreshUser() async {
        do {
            let userWithStats: UserWithStats = try await APIClient.shared.request(
                url: APIEndpoints.Auth.me
            )
            self.currentUser = userWithStats.user
            self.userStats = userWithStats.stats
        } catch {
            // Silently fail - user can pull to refresh
        }
    }

    @MainActor
    private func fetchUserStats() async {
        do {
            let userWithStats: UserWithStats = try await APIClient.shared.request(
                url: APIEndpoints.Auth.me
            )
            self.userStats = userWithStats.stats
        } catch {
            // Stats are non-critical
        }
    }
}

// MARK: - Auth Response

struct AuthResponse: Codable {
    let user: User
    let token: String
}
