import Foundation
import GoogleSignIn
import UIKit

enum GoogleSignInHelper {
    static let clientID = "145360208718-pkfb3vc6h95c8olf63qa4ks0o673us59.apps.googleusercontent.com"

    static func configure() {
        GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID)
    }

    static func handle(url: URL) -> Bool {
        GIDSignIn.sharedInstance.handle(url)
    }

    @MainActor
    static func signIn() async throws -> String {
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let rootVC = windowScene.windows.first?.rootViewController else {
            throw GoogleSignInError.noRootViewController
        }

        let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: rootVC)

        guard let idToken = result.user.idToken?.tokenString else {
            throw GoogleSignInError.noIDToken
        }

        return idToken
    }
}

enum GoogleSignInError: LocalizedError {
    case noRootViewController
    case noIDToken

    var errorDescription: String? {
        switch self {
        case .noRootViewController: return "Unable to find root view controller"
        case .noIDToken: return "Failed to get Google ID token"
        }
    }
}
