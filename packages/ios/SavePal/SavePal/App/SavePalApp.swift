import SwiftUI

@main
struct SavePalApp: App {
    @State private var authManager = AuthManager.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(authManager)
        }
    }
}
