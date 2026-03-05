import SwiftUI

struct MakePaymentView: View {
    let paymentId: String
    @Environment(\.dismiss) private var dismiss
    @State private var breakdown: PaymentBreakdown?
    @State private var methods: [PaymentMethod] = []
    @State private var selectedMethodId: String?
    @State private var isLoading = true
    @State private var isProcessing = false
    @State private var errorMessage: String?
    @State private var showSuccess = false

    var onPaymentCompleted: (() -> Void)?

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    LoadingView(message: "Loading payment details...")
                } else if showSuccess {
                    successView
                } else if let breakdown = breakdown {
                    paymentForm(breakdown)
                } else {
                    EmptyStateView(
                        icon: "exclamationmark.triangle",
                        title: "Error",
                        message: errorMessage ?? "Unable to load payment details."
                    )
                }
            }
            .navigationTitle("Make Payment")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .task { await loadData() }
        }
    }

    private func paymentForm(_ breakdown: PaymentBreakdown) -> some View {
        ScrollView {
            VStack(spacing: 20) {
                // Breakdown
                VStack(spacing: 12) {
                    HStack {
                        Text("Contribution")
                        Spacer()
                        Text(String(format: "$%.2f", breakdown.contribution))
                    }
                    HStack {
                        Text("Processing Fee")
                        Spacer()
                        Text(String(format: "$%.2f", breakdown.processingFee))
                            .foregroundStyle(.secondary)
                    }
                    Divider()
                    HStack {
                        Text("Total")
                            .fontWeight(.semibold)
                        Spacer()
                        Text(String(format: "$%.2f", breakdown.total))
                            .fontWeight(.bold)
                            .foregroundStyle(Color.savePalBlue)
                    }
                }
                .padding()
                .background(.regularMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 12))

                // Payment Method Selection
                VStack(alignment: .leading, spacing: 12) {
                    Text("Payment Method")
                        .font(.headline)

                    if methods.isEmpty {
                        HStack {
                            Image(systemName: "exclamationmark.circle")
                                .foregroundStyle(.orange)
                            Text("No payment methods. Add a card first.")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    } else {
                        ForEach(methods) { method in
                            Button {
                                selectedMethodId = method.id
                            } label: {
                                HStack {
                                    Image(systemName: selectedMethodId == method.id ? "checkmark.circle.fill" : "circle")
                                        .foregroundStyle(selectedMethodId == method.id ? Color.savePalBlue : .secondary)
                                    Image(systemName: "creditcard.fill")
                                        .foregroundStyle(.secondary)
                                    Text(method.displayName)
                                        .foregroundStyle(.primary)
                                    Spacer()
                                    if method.isDefault {
                                        Text("Default")
                                            .font(.caption)
                                            .foregroundStyle(Color.savePalBlue)
                                    }
                                }
                            }
                        }
                    }
                }
                .padding()
                .background(.regularMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 12))

                if let error = errorMessage {
                    Text(error)
                        .font(.subheadline)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                }

                // Pay Button
                Button {
                    Task { await processPayment() }
                } label: {
                    if isProcessing {
                        ProgressView()
                            .tint(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                    } else {
                        Text("Pay \(String(format: "$%.2f", breakdown.total))")
                            .fontWeight(.semibold)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(Color.savePalBlue)
                .disabled(isProcessing || methods.isEmpty)
            }
            .padding()
        }
    }

    private var successView: some View {
        VStack(spacing: 16) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 56))
                .foregroundStyle(.green)
            Text("Payment Successful!")
                .font(.title3)
                .fontWeight(.semibold)
            Text("Your contribution has been processed.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Button("Done") {
                onPaymentCompleted?()
                dismiss()
            }
            .buttonStyle(.borderedProminent)
            .tint(Color.savePalBlue)
        }
    }

    private func loadData() async {
        do {
            async let breakdownReq: PaymentBreakdown = APIClient.shared.request(
                url: APIEndpoints.Payments.breakdown(paymentId)
            )
            async let methodsReq: [PaymentMethod] = APIClient.shared.request(
                url: APIEndpoints.PaymentMethods.base
            )
            let (b, m) = try await (breakdownReq, methodsReq)
            breakdown = b
            methods = m
            selectedMethodId = m.first(where: { $0.isDefault })?.id ?? m.first?.id
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    private func processPayment() async {
        isProcessing = true
        errorMessage = nil
        defer { isProcessing = false }
        do {
            var body: [String: Any]? = nil
            if let methodId = selectedMethodId {
                body = ["paymentMethodId": methodId]
            }
            let _: Payment = try await APIClient.shared.request(
                url: APIEndpoints.Payments.process(paymentId),
                method: "POST",
                body: body
            )
            showSuccess = true
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
