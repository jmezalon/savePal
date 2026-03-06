import Foundation

struct PaymentMethod: Codable, Identifiable {
    let id: String
    let userId: String
    let stripePaymentMethodId: String
    let type: String
    let last4: String
    var brand: String?
    var expiryMonth: Int?
    var expiryYear: Int?
    var isDefault: Bool
    let createdAt: String
    let updatedAt: String

    var displayName: String {
        let brandName = brand?.capitalized ?? "Card"
        return "\(brandName) ····\(last4)"
    }
}

struct StripeConfig: Codable {
    let publishableKey: String
}

struct SetupIntentResponse: Codable {
    let id: String?
    let clientSecret: String?
    let client_secret: String?

    var secret: String? {
        clientSecret ?? client_secret
    }
}
