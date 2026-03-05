import SwiftUI

struct PaymentHistoryView: View {
    @State private var selectedTab = 0
    @State private var payments: [Payment] = []
    @State private var payouts: [Payout] = []
    @State private var paymentStats: PaymentStats?
    @State private var payoutStats: PayoutStats?
    @State private var isLoading = true

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Segmented Control
                Picker("", selection: $selectedTab) {
                    Text("Payments").tag(0)
                    Text("Payouts").tag(1)
                }
                .pickerStyle(.segmented)
                .padding()

                if isLoading {
                    LoadingView()
                } else if selectedTab == 0 {
                    paymentsTab
                } else {
                    payoutsTab
                }
            }
            .navigationTitle("Payment History")
            .refreshable {
                await loadData()
            }
            .task {
                await loadData()
            }
        }
    }

    // MARK: - Payments Tab

    private var paymentsTab: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                // Stats
                if let stats = paymentStats {
                    HStack(spacing: 12) {
                        miniStat(title: "Total Paid", value: stats.paidAmount.formattedCurrency, color: .green)
                        miniStat(title: "Pending", value: "\(stats.pending)", color: .orange)
                    }
                    .padding(.horizontal)
                }

                if payments.isEmpty {
                    EmptyStateView(
                        icon: "creditcard",
                        title: "No Payments",
                        message: "Your payment history will appear here."
                    )
                    .frame(height: 300)
                } else {
                    ForEach(payments) { payment in
                        paymentRow(payment)
                    }
                    .padding(.horizontal)
                }
            }
            .padding(.vertical)
        }
    }

    private func paymentRow(_ payment: Payment) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(payment.cycle?.group?.name ?? "Group Payment")
                    .font(.subheadline)
                    .fontWeight(.medium)
                if let cycle = payment.cycle {
                    Text("Cycle #\(cycle.cycleNumber)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                if let date = payment.paidAt {
                    Text(date.formattedDate)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                Text(payment.formattedAmount)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                StatusBadge(paymentStatus: payment.status)
            }
        }
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Payouts Tab

    private var payoutsTab: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                if let stats = payoutStats {
                    HStack(spacing: 12) {
                        miniStat(title: "Received", value: stats.receivedAmount.formattedCurrency, color: .green)
                        miniStat(title: "Pending", value: "\(stats.pending)", color: .orange)
                    }
                    .padding(.horizontal)
                }

                if payouts.isEmpty {
                    EmptyStateView(
                        icon: "banknote",
                        title: "No Payouts",
                        message: "Your payouts will appear here when you receive them."
                    )
                    .frame(height: 300)
                } else {
                    ForEach(payouts) { payout in
                        payoutRow(payout)
                    }
                    .padding(.horizontal)
                }
            }
            .padding(.vertical)
        }
    }

    private func payoutRow(_ payout: Payout) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(payout.cycle?.group?.name ?? "Group Payout")
                    .font(.subheadline)
                    .fontWeight(.medium)
                if let cycle = payout.cycle {
                    Text("Cycle #\(cycle.cycleNumber)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                Text(payout.formattedNetAmount)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(.green)
                StatusBadge(paymentStatus: payout.status)
            }
        }
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Helpers

    private func miniStat(title: String, value: String, color: Color) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.headline)
                .foregroundStyle(color)
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private func loadData() async {
        defer { isLoading = false }
        do {
            async let p: [Payment] = APIClient.shared.request(url: APIEndpoints.Payments.myPayments)
            async let po: [Payout] = APIClient.shared.request(url: APIEndpoints.Payouts.myPayouts)
            async let ps: PaymentStats = APIClient.shared.request(url: APIEndpoints.Payments.myStats)
            async let pos: PayoutStats = APIClient.shared.request(url: APIEndpoints.Payouts.myStats)

            let (paymentsResult, payoutsResult, paymentStatsResult, payoutStatsResult) = try await (p, po, ps, pos)
            payments = paymentsResult
            payouts = payoutsResult
            paymentStats = paymentStatsResult
            payoutStats = payoutStatsResult
        } catch {
            // Individual failures are non-critical
        }
    }
}

#Preview {
    PaymentHistoryView()
}
