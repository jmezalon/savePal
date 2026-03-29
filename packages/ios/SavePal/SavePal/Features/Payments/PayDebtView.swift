import SwiftUI

struct PayDebtView: View {
    let groupId: String
    @Environment(\.dismiss) private var dismiss
    @State private var debtInfo: DebtInfo?
    @State private var methods: [PaymentMethod] = []
    @State private var selectedMethodId: String?
    @State private var isLoading = true
    @State private var isProcessing = false
    @State private var errorMessage: String?
    @State private var showSuccess = false
    @State private var paymentResult: DebtPaymentResult?

    var onPaymentCompleted: (() -> Void)?

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    LoadingView(message: "Loading debt details...")
                } else if showSuccess {
                    successView
                } else if let debtInfo = debtInfo {
                    paymentForm(debtInfo)
                } else {
                    EmptyStateView(
                        icon: "exclamationmark.triangle",
                        title: "Error",
                        message: errorMessage ?? "Unable to load debt details."
                    )
                }
            }
            .navigationTitle("Pay Debt")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .task { await loadData() }
        }
    }

    private func paymentForm(_ info: DebtInfo) -> some View {
        ScrollView {
            VStack(spacing: 20) {
                // Debt Breakdown
                VStack(spacing: 12) {
                    HStack {
                        Text("Outstanding Debt")
                        Spacer()
                        Text(info.outstandingDebt.formattedCurrency)
                    }
                    HStack {
                        Text("Processing Fee")
                        Spacer()
                        Text(info.processingFee.formattedCurrency)
                            .foregroundStyle(.secondary)
                    }
                    Divider()
                    HStack {
                        Text("Total Charge")
                            .fontWeight(.semibold)
                        Spacer()
                        Text(info.chargeAmount.formattedCurrency)
                            .fontWeight(.bold)
                            .foregroundStyle(Color.savePalAmber)
                    }
                }
                .padding()
                .background(.regularMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 12))

                // Debt Payments Breakdown
                if !info.debtPayments.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Missed Payments")
                            .font(.headline)

                        ForEach(info.debtPayments) { payment in
                            HStack {
                                Image(systemName: "exclamationmark.circle.fill")
                                    .foregroundStyle(Color.savePalAmber)
                                    .font(.caption)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Cycle \(payment.cycle.cycleNumber)")
                                        .font(.subheadline)
                                    Text(payment.createdAt.formattedDate)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                Text(payment.amount.formattedCurrency)
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                            }
                        }
                    }
                    .padding()
                    .background(.regularMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }

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
                        Text("Pay Debt \(info.chargeAmount.formattedCurrency)")
                            .fontWeight(.semibold)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(Color.savePalAmber)
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
            Text("Debt Paid!")
                .font(.title3)
                .fontWeight(.semibold)
            if let result = paymentResult {
                Text("\(result.paymentsResolved) payment\(result.paymentsResolved == 1 ? "" : "s") resolved.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
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
            async let debtReq: DebtInfo = APIClient.shared.request(
                url: APIEndpoints.Payments.debtInfo(groupId)
            )
            async let methodsReq: [PaymentMethod] = APIClient.shared.request(
                url: APIEndpoints.PaymentMethods.base
            )
            let (d, m) = try await (debtReq, methodsReq)
            debtInfo = d
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
            let result: DebtPaymentResult = try await APIClient.shared.request(
                url: APIEndpoints.Payments.payDebt(groupId),
                method: "POST",
                body: body
            )
            paymentResult = result
            showSuccess = true
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
