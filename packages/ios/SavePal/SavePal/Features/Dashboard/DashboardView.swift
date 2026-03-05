import SwiftUI

struct DashboardView: View {
    @Environment(AuthManager.self) private var authManager
    @State private var groups: [SavingsGroup] = []
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Welcome & Trust Score
                    if let user = authManager.currentUser {
                        welcomeCard(user: user)
                    }

                    // Verification Status
                    if let user = authManager.currentUser {
                        verificationCard(user: user)
                    }

                    // Stats
                    if let stats = authManager.userStats {
                        statsSection(stats: stats)
                    }

                    // Group Previews
                    groupPreviewsSection
                }
                .padding()
            }
            .navigationTitle("Dashboard")
            .refreshable {
                await refresh()
            }
            .task {
                await loadData()
            }
        }
    }

    // MARK: - Welcome Card

    private func welcomeCard(user: User) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Welcome back,")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Text(user.firstName)
                        .font(.title2)
                        .fontWeight(.bold)
                }
                Spacer()
                trustScoreRing(score: user.trustScore)
            }
        }
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private func trustScoreRing(score: Double) -> some View {
        ZStack {
            Circle()
                .stroke(.quaternary, lineWidth: 4)
            Circle()
                .trim(from: 0, to: score / 100)
                .stroke(trustScoreColor(score), style: StrokeStyle(lineWidth: 4, lineCap: .round))
                .rotationEffect(.degrees(-90))
            VStack(spacing: 0) {
                Text("\(Int(score))")
                    .font(.title3)
                    .fontWeight(.bold)
                Text("Trust")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(width: 64, height: 64)
    }

    private func trustScoreColor(_ score: Double) -> Color {
        if score >= 70 { return .green }
        if score >= 40 { return .orange }
        return .red
    }

    // MARK: - Verification Card

    private func verificationCard(user: User) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Verification Status")
                .font(.headline)

            HStack(spacing: 16) {
                verificationItem(
                    icon: "envelope.fill",
                    label: "Email",
                    verified: user.emailVerified
                )
                verificationItem(
                    icon: "phone.fill",
                    label: "Phone",
                    verified: user.phoneVerified
                )
                verificationItem(
                    icon: "banknote.fill",
                    label: "Bank",
                    verified: user.stripeConnectOnboarded
                )
            }
        }
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private func verificationItem(icon: String, label: String, verified: Bool) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(verified ? .green : .secondary)
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
            Image(systemName: verified ? "checkmark.circle.fill" : "xmark.circle")
                .font(.caption)
                .foregroundStyle(verified ? .green : .red.opacity(0.6))
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Stats

    private func statsSection(stats: UserStats) -> some View {
        HStack(spacing: 12) {
            statCard(title: "Total Saved", value: stats.totalSaved.formattedCurrency, icon: "dollarsign.circle.fill", color: .green)
            statCard(title: "Active Groups", value: "\(stats.activeGroups)", icon: "person.3.fill", color: .blue)
        }
    }

    private func statCard(title: String, value: String, icon: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(color)
            Text(value)
                .font(.title3)
                .fontWeight(.bold)
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Group Previews

    private var groupPreviewsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Your Groups")
                    .font(.headline)
                Spacer()
                if !groups.isEmpty {
                    NavigationLink("See All") {
                        // Will navigate to Groups tab
                    }
                    .font(.subheadline)
                    .foregroundStyle(Color.savePalBlue)
                }
            }

            if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, minHeight: 100)
            } else if groups.isEmpty {
                EmptyStateView(
                    icon: "person.3",
                    title: "No Groups",
                    message: "Create or join a savings group to get started."
                )
                .frame(height: 200)
            } else {
                ForEach(groups.prefix(3)) { group in
                    groupPreviewCard(group)
                }
            }
        }
    }

    private func groupPreviewCard(_ group: SavingsGroup) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(group.name)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                    StatusBadge(groupStatus: group.status)
                }
                Text("\(group.currentMembers)/\(group.maxMembers) members")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Text(group.formattedContribution)
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundStyle(Color.savePalBlue)
        }
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Data Loading

    private func loadData() async {
        isLoading = true
        defer { isLoading = false }
        do {
            groups = try await APIClient.shared.request(url: APIEndpoints.Groups.base)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func refresh() async {
        await authManager.refreshUser()
        await loadData()
    }
}

#Preview {
    DashboardView()
        .environment(AuthManager.shared)
}
