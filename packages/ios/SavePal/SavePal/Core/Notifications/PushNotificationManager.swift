import Foundation
import UIKit
import UserNotifications

@Observable
final class PushNotificationManager: NSObject {
    static let shared = PushNotificationManager()

    var deviceToken: String?
    var permissionGranted = false

    private override init() {
        super.init()
    }

    // MARK: - Request Permission

    func requestPermission() async {
        do {
            let granted = try await UNUserNotificationCenter.current()
                .requestAuthorization(options: [.alert, .badge, .sound])
            await MainActor.run {
                self.permissionGranted = granted
            }
            if granted {
                await MainActor.run {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            }
        } catch {
            print("Push notification permission error: \(error)")
        }
    }

    // MARK: - Token Registration

    func didRegisterForRemoteNotifications(deviceToken data: Data) {
        let token = data.map { String(format: "%02.2hhx", $0) }.joined()
        self.deviceToken = token
        Task { await registerTokenWithBackend(token) }
    }

    func didFailToRegisterForRemoteNotifications(error: Error) {
        print("Failed to register for remote notifications: \(error)")
    }

    // MARK: - Backend Registration

    private func registerTokenWithBackend(_ token: String) async {
        guard KeychainHelper.getToken() != nil else { return }
        do {
            _ = try await APIClient.shared.requestMessage(
                url: APIEndpoints.Notifications.deviceToken,
                method: "POST",
                body: ["token": token, "platform": "ios"]
            )
        } catch {
            print("Failed to register device token: \(error)")
        }
    }

    func unregisterToken() async {
        guard let token = deviceToken else { return }
        do {
            _ = try await APIClient.shared.requestMessage(
                url: APIEndpoints.Notifications.deviceToken,
                method: "DELETE",
                body: ["token": token]
            )
        } catch {
            print("Failed to unregister device token: \(error)")
        }
        self.deviceToken = nil
    }

    // MARK: - Re-register on Login

    func registerExistingTokenIfNeeded() async {
        if let token = deviceToken {
            await registerTokenWithBackend(token)
        }
    }
}

// MARK: - UNUserNotificationCenterDelegate

extension PushNotificationManager: UNUserNotificationCenterDelegate {
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // Show notification even when app is in foreground
        completionHandler([.banner, .badge, .sound])
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        handleNotificationTap(userInfo: userInfo)
        completionHandler()
    }

    private func handleNotificationTap(userInfo: [AnyHashable: Any]) {
        // Future: navigate to specific screen based on notification type
        if let custom = userInfo["custom"] as? [String: Any] {
            print("Notification tapped with data: \(custom)")
        }
    }
}
