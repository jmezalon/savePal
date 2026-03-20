import SwiftUI
import StripePaymentSheet

struct AddCardView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var isLoading = true
    @State private var isSaving = false
    @State private var paymentSheet: PaymentSheet?
    @State private var errorMessage: String?
    @State private var showSuccess = false
    @State private var setupIntentId: String?

    var onCardAdded: (() -> Void)?

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                if isLoading {
                    LoadingView(message: "Preparing card setup...")
                } else if isSaving {
                    LoadingView(message: "Saving card...")
                } else if showSuccess {
                    successView
                } else if let error = errorMessage {
                    errorView(error)
                } else if paymentSheet != nil {
                    readyView
                }
            }
            .padding()
            .navigationTitle("Add Card")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .task { await createSetupIntent() }
        }
    }

    private var readyView: some View {
        VStack(spacing: 20) {
            Image(systemName: "creditcard.fill")
                .font(.system(size: 48))
                .foregroundStyle(Color.savePalBlue)

            Text("Add a Payment Card")
                .font(.title3)
                .fontWeight(.semibold)

            Text("Your card will be securely saved for future payments.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button {
                presentPaymentSheet()
            } label: {
                Text("Add Card")
                    .fontWeight(.semibold)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Color.savePalBlue)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    private func presentPaymentSheet() {
        guard let sheet = paymentSheet,
              let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let rootVC = windowScene.windows.first?.rootViewController else { return }
        // Find the topmost presented view controller
        var topVC = rootVC
        while let presented = topVC.presentedViewController {
            topVC = presented
        }
        sheet.present(from: topVC) { result in
            handlePaymentSheetResult(result)
        }
    }

    private var successView: some View {
        VStack(spacing: 16) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 56))
                .foregroundStyle(.green)
            Text("Card Added!")
                .font(.title3)
                .fontWeight(.semibold)
            Text("Your card has been saved successfully.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Button("Done") {
                onCardAdded?()
                dismiss()
            }
            .buttonStyle(.borderedProminent)
            .tint(Color.savePalBlue)
        }
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 48))
                .foregroundStyle(.orange)
            Text("Setup Failed")
                .font(.title3)
                .fontWeight(.semibold)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button("Try Again") {
                errorMessage = nil
                isLoading = true
                Task { await createSetupIntent() }
            }
            .buttonStyle(.borderedProminent)
            .tint(Color.savePalBlue)
        }
    }

    private func createSetupIntent() async {
        // Ensure Stripe is configured before creating setup intent
        await StripeManager.shared.configure()

        do {
            let response: SetupIntentResponse = try await APIClient.shared.request(
                url: APIEndpoints.PaymentMethods.setupIntent,
                method: "POST"
            )
            guard let secret = response.secret else {
                errorMessage = "Invalid setup response from server."
                isLoading = false
                return
            }
            self.setupIntentId = response.id
            let sheet = StripeManager.shared.makeSetupPaymentSheet(clientSecret: secret)
            await MainActor.run {
                self.paymentSheet = sheet
                self.isLoading = false
            }
        } catch let error as APIError {
            errorMessage = error.errorDescription
            isLoading = false
        } catch {
            errorMessage = error.localizedDescription
            isLoading = false
        }
    }

    private func handlePaymentSheetResult(_ result: PaymentSheetResult) {
        DispatchQueue.main.async {
            switch result {
            case .completed:
                Task { await confirmAndSaveCard() }
            case .canceled:
                break
            case .failed(let error):
                errorMessage = error.localizedDescription
            }
        }
    }

    private func confirmAndSaveCard() async {
        guard let setupIntentId = setupIntentId else {
            await MainActor.run { showSuccess = true }
            return
        }

        await MainActor.run { isSaving = true }

        do {
            _ = try await APIClient.shared.requestMessage(
                url: APIEndpoints.PaymentMethods.confirmSetup,
                method: "POST",
                body: ["setupIntentId": setupIntentId]
            )
        } catch {
            #if DEBUG
            print("AddCardView: Failed to confirm setup: \(error)")
            #endif
        }

        await MainActor.run {
            isSaving = false
            showSuccess = true
        }
    }
}
