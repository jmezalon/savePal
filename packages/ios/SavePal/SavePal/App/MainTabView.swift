import SwiftUI

struct MainTabView: View {
    @State private var selectedTab = 0
    @State private var unreadCount = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            DashboardView(unreadCount: $unreadCount)
                .tabItem {
                    Label("Dashboard", systemImage: "house.fill")
                }
                .tag(0)
                .badge(unreadCount > 0 ? "" : nil)

            GroupsListView()
                .tabItem {
                    Label("Groups", systemImage: "person.3.fill")
                }
                .tag(1)

            PaymentHistoryView()
                .tabItem {
                    Label("Payments", systemImage: "creditcard.fill")
                }
                .tag(2)

            ProfileView()
                .tabItem {
                    Label("Profile", systemImage: "person.circle.fill")
                }
                .tag(3)
        }
        .tint(Color.savePalBlue)
        .task {
            await fetchUnreadCount()
        }
    }

    private func fetchUnreadCount() async {
        do {
            let result: UnreadCount = try await APIClient.shared.request(
                url: APIEndpoints.Notifications.unreadCount
            )
            unreadCount = result.count
        } catch {}
    }
}

#Preview {
    MainTabView()
        .environment(AuthManager.shared)
}
