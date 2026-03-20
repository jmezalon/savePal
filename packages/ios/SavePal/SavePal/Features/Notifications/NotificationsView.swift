import SwiftUI
import UserNotifications

struct NotificationsView: View {
    @Binding var unreadCount: Int
    @State private var notifications: [AppNotification] = []
    @State private var isLoading = true

    private var todayNotifications: [AppNotification] {
        notifications.filter { notification in
            guard let date = notification.sentAt.toDate else { return false }
            return Calendar.current.isDateInToday(date)
        }
    }

    private var earlierNotifications: [AppNotification] {
        notifications.filter { notification in
            guard let date = notification.sentAt.toDate else { return true }
            return !Calendar.current.isDateInToday(date)
        }
    }

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    LoadingView()
                } else if notifications.isEmpty {
                    EmptyStateView(
                        icon: "bell.slash",
                        title: "No Notifications",
                        message: "You're all caught up!"
                    )
                } else {
                    notificationsList
                }
            }
            .navigationTitle("Notifications")
            .toolbar {
                if !notifications.isEmpty {
                    ToolbarItem(placement: .primaryAction) {
                        Button("Mark All Read") {
                            Task { await markAllRead() }
                        }
                        .font(.subheadline)
                    }
                }
            }
            .refreshable {
                await loadNotifications()
            }
            .task {
                await loadNotifications()
            }
        }
    }

    private var notificationsList: some View {
        List {
            if !todayNotifications.isEmpty {
                Section("Today") {
                    ForEach(todayNotifications) { notification in
                        notificationRow(notification)
                    }
                    .onDelete { indexSet in
                        deleteNotifications(at: indexSet, from: todayNotifications)
                    }
                }
            }

            if !earlierNotifications.isEmpty {
                Section("Earlier") {
                    ForEach(earlierNotifications) { notification in
                        notificationRow(notification)
                    }
                    .onDelete { indexSet in
                        deleteNotifications(at: indexSet, from: earlierNotifications)
                    }
                }
            }
        }
    }

    private func notificationRow(_ notification: AppNotification) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: iconForType(notification.type))
                .font(.title3)
                .foregroundStyle(colorForType(notification.type))
                .frame(width: 28)

            VStack(alignment: .leading, spacing: 4) {
                Text(notification.title)
                    .font(.subheadline)
                    .fontWeight(notification.isRead ? .regular : .semibold)
                Text(notification.message)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
                HStack {
                    if let group = notification.group {
                        Text(group.name)
                            .font(.caption2)
                            .foregroundStyle(Color.savePalBlue)
                    }
                    Text(notification.sentAt.relativeDate)
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
            }

            Spacer()

            if !notification.isRead {
                Circle()
                    .fill(Color.savePalBlue)
                    .frame(width: 8, height: 8)
            }
        }
        .contentShape(Rectangle())
        .onTapGesture {
            if !notification.isRead {
                Task { await markRead(notification) }
            }
        }
    }

    private func iconForType(_ type: NotificationType) -> String {
        switch type {
        case .PAYMENT_DUE, .AUTO_PAYMENT_SCHEDULED: return "clock.fill"
        case .PAYMENT_RECEIVED, .AUTO_PAYMENT_PROCESSED: return "checkmark.circle.fill"
        case .PAYOUT_PENDING: return "hourglass"
        case .PAYOUT_COMPLETED: return "banknote.fill"
        case .PAYOUT_FAILED, .PAYMENT_FAILED: return "exclamationmark.triangle.fill"
        case .GROUP_INVITE: return "person.badge.plus"
        case .GROUP_STARTED: return "play.circle.fill"
        case .GROUP_COMPLETED: return "flag.checkered"
        case .CONNECT_ONBOARDING_REQUIRED: return "building.columns"
        case .REMINDER: return "bell.fill"
        case .DEBT_RECORDED, .DEBT_DEDUCTED_FROM_PAYOUT: return "exclamationmark.circle.fill"
        case .PAYMENT_DISPUTED: return "flag.fill"
        case .BANK_ACCOUNT_UPDATED: return "building.columns.fill"
        }
    }

    private func colorForType(_ type: NotificationType) -> Color {
        switch type {
        case .PAYMENT_RECEIVED, .PAYOUT_COMPLETED, .AUTO_PAYMENT_PROCESSED, .GROUP_COMPLETED:
            return .green
        case .PAYMENT_FAILED, .PAYOUT_FAILED, .DEBT_RECORDED, .PAYMENT_DISPUTED:
            return .red
        case .PAYMENT_DUE, .PAYOUT_PENDING, .AUTO_PAYMENT_SCHEDULED, .CONNECT_ONBOARDING_REQUIRED:
            return .orange
        case .GROUP_INVITE, .GROUP_STARTED, .REMINDER, .DEBT_DEDUCTED_FROM_PAYOUT:
            return .blue
        case .BANK_ACCOUNT_UPDATED:
            return .blue
        }
    }

    // MARK: - Actions

    private func loadNotifications() async {
        defer { isLoading = false }
        do {
            notifications = try await APIClient.shared.request(url: APIEndpoints.Notifications.base)
        } catch {
            print("Failed to load notifications: \(error)")
        }
    }

    private func markRead(_ notification: AppNotification) async {
        do {
            _ = try await APIClient.shared.requestMessage(
                url: APIEndpoints.Notifications.read(notification.id),
                method: "PATCH"
            )
            if let index = notifications.firstIndex(where: { $0.id == notification.id }) {
                notifications[index].isRead = true
                unreadCount = max(0, unreadCount - 1)
                if unreadCount == 0 {
                    try? await UNUserNotificationCenter.current().setBadgeCount(0)
                }
            }
        } catch {}
    }

    private func markAllRead() async {
        do {
            _ = try await APIClient.shared.requestMessage(
                url: APIEndpoints.Notifications.readAll,
                method: "PATCH"
            )
            for i in notifications.indices {
                notifications[i].isRead = true
            }
            unreadCount = 0
            try? await UNUserNotificationCenter.current().setBadgeCount(0)
        } catch {}
    }

    private func deleteNotifications(at offsets: IndexSet, from list: [AppNotification]) {
        for index in offsets {
            let notification = list[index]
            Task {
                do {
                    _ = try await APIClient.shared.requestMessage(
                        url: APIEndpoints.Notifications.delete(notification.id),
                        method: "DELETE"
                    )
                    notifications.removeAll { $0.id == notification.id }
                } catch {}
            }
        }
    }
}

#Preview {
    NotificationsView(unreadCount: .constant(3))
}
