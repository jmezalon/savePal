import Foundation
import StripePaymentSheet

@Observable
final class StripeManager {
    static let shared = StripeManager()

    private(set) var isConfigured = false
    private(set) var publishableKey: String?

    private init() {}

    func configure() async {
        guard !isConfigured else { return }
        do {
            let config: StripeConfig = try await APIClient.shared.request(
                url: APIEndpoints.PaymentMethods.config
            )
            await MainActor.run {
                StripeAPI.defaultPublishableKey = config.publishableKey
                self.publishableKey = config.publishableKey
                self.isConfigured = true
            }
        } catch {
            #if DEBUG
            print("StripeManager: Failed to fetch config: \(error)")
            #endif
        }
    }

    func makeSetupPaymentSheet(clientSecret: String) -> PaymentSheet {
        var configuration = PaymentSheet.Configuration()
        configuration.merchantDisplayName = "SavePals"
        configuration.allowsDelayedPaymentMethods = false
        configuration.billingDetailsCollectionConfiguration.name = .always
        return PaymentSheet(setupIntentClientSecret: clientSecret, configuration: configuration)
    }
}
