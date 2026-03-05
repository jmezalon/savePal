import SwiftUI

struct GroupDetailView: View {
    let groupId: String
    @State private var group: SavingsGroup?
    @State private var cycles: [Cycle] = []
    @State private var currentCycle: Cycle?
    @State private var readiness: GroupReadiness?
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var showDeleteConfirm = false
    @State private var isStarting = false

    @Environment(AuthManager.self) private var authManager

    private var isOwner: Bool {
        group?.createdById == authManager.currentUser?.id
    }

    var body: some View {
        Group {
            if isLoading {
                LoadingView(message: "Loading group...")
            } else if let group = group {
                groupContent(group)
            } else {
                EmptyStateView(
                    icon: "exclamationmark.triangle",
                    title: "Group Not Found",
                    message: errorMessage ?? "Unable to load this group."
                )
            }
        }
        .navigationTitle(group?.name ?? "Group")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable {
            await loadAll()
        }
        .task {
            await loadAll()
        }
        .alert("Delete Group", isPresented: $showDeleteConfirm) {
            Button("Delete", role: .destructive) {
                Task { await deleteGroup() }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Are you sure you want to delete this group? This action cannot be undone.")
        }
    }

    private func groupContent(_ group: SavingsGroup) -> some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                // Header
                headerSection(group)

                // Stats
                statsCards(group)

                // Invite Code (owner only)
                if isOwner && group.status == .PENDING {
                    inviteSection(group)
                }

                // Members
                membersSection(group)

                // Start Group (owner, pending, full)
                if isOwner && group.status == .PENDING && group.isFull {
                    startGroupSection
                }

                // Current Cycle
                if let cycle = currentCycle {
                    currentCycleSection(cycle)
                }

                // All Cycles
                if !cycles.isEmpty {
                    allCyclesSection
                }

                // Owner Actions
                if isOwner && group.status == .PENDING {
                    ownerActionsSection
                }
            }
            .padding()
        }
    }

    // MARK: - Header

    private func headerSection(_ group: SavingsGroup) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(group.name)
                    .font(.title2)
                    .fontWeight(.bold)
                Spacer()
                StatusBadge(groupStatus: group.status)
            }
            if let desc = group.description, !desc.isEmpty {
                Text(desc)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    // MARK: - Stats

    private func statsCards(_ group: SavingsGroup) -> some View {
        HStack(spacing: 12) {
            infoCard(title: "Contribution", value: group.formattedContribution, icon: "dollarsign.circle")
            infoCard(title: "Members", value: "\(group.currentMembers)/\(group.maxMembers)", icon: "person.3")
            infoCard(title: "Method", value: group.payoutMethod.displayName, icon: "arrow.triangle.swap")
        }
    }

    private func infoCard(title: String, value: String, icon: String) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(Color.savePalBlue)
            Text(value)
                .font(.subheadline)
                .fontWeight(.semibold)
            Text(title)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Invite Code

    private func inviteSection(_ group: SavingsGroup) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Invite Code")
                .font(.headline)

            HStack {
                Text(group.inviteCode)
                    .font(.system(.body, design: .monospaced))
                    .textSelection(.enabled)

                Spacer()

                ShareLink(
                    item: "Join my SavePals savings group \"\(group.name)\"! Use invite code: \(group.inviteCode)",
                    subject: Text("Join my SavePals group"),
                    message: Text("Join \(group.name) on SavePals")
                ) {
                    Label("Share", systemImage: "square.and.arrow.up")
                        .font(.subheadline)
                }
            }
        }
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Members

    private func membersSection(_ group: SavingsGroup) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Members")
                .font(.headline)

            if let memberships = group.memberships {
                ForEach(memberships) { membership in
                    memberRow(membership)
                }
            }
        }
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func memberRow(_ membership: Membership) -> some View {
        HStack {
            // Avatar
            ZStack {
                Circle()
                    .fill(Color.savePalBlue.opacity(0.2))
                Text(membership.user?.initials ?? "?")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(Color.savePalBlue)
            }
            .frame(width: 36, height: 36)

            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 4) {
                    Text(membership.user?.fullName ?? "Unknown")
                        .font(.subheadline)
                    if membership.role == .OWNER {
                        Text("Owner")
                            .font(.caption2)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.savePalBlue.opacity(0.15))
                            .foregroundStyle(Color.savePalBlue)
                            .clipShape(Capsule())
                    }
                }
                Text("Position #\(membership.payoutPosition)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            if let user = membership.user {
                HStack(spacing: 4) {
                    if user.emailVerified == true {
                        Image(systemName: "envelope.fill")
                            .font(.caption2)
                            .foregroundStyle(.green)
                    }
                    if user.phoneVerified == true {
                        Image(systemName: "phone.fill")
                            .font(.caption2)
                            .foregroundStyle(.green)
                    }
                }
            }
        }
    }

    // MARK: - Start Group

    private var startGroupSection: some View {
        VStack(spacing: 12) {
            if let readiness = readiness {
                if !readiness.ready {
                    VStack(alignment: .leading, spacing: 8) {
                        if !readiness.membersWithoutPaymentMethod.isEmpty {
                            Text("Missing payment method:")
                                .font(.caption)
                                .foregroundStyle(.orange)
                            ForEach(readiness.membersWithoutPaymentMethod, id: \.firstName) { member in
                                Text("  \(member.firstName) \(member.lastName)")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        if !readiness.membersWithoutVerification.isEmpty {
                            Text("Missing email verification:")
                                .font(.caption)
                                .foregroundStyle(.orange)
                            ForEach(readiness.membersWithoutVerification, id: \.firstName) { member in
                                Text("  \(member.firstName) \(member.lastName)")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                    .padding()
                    .background(.orange.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }

            Button {
                Task { await startGroup() }
            } label: {
                if isStarting {
                    ProgressView().tint(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                } else {
                    Text("Start Group")
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                }
            }
            .buttonStyle(.borderedProminent)
            .tint(Color.savePalBlue)
            .disabled(isStarting || readiness?.ready == false)
        }
    }

    // MARK: - Current Cycle

    private func currentCycleSection(_ cycle: Cycle) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Current Cycle (#\(cycle.cycleNumber))")
                .font(.headline)

            HStack {
                Text("Due: \(cycle.dueDate.formattedDate)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Spacer()
                Text("Total: \(cycle.totalAmount.formattedCurrency)")
                    .font(.subheadline)
                    .fontWeight(.semibold)
            }

            if let payments = cycle.payments {
                ForEach(payments) { payment in
                    HStack {
                        Text(payment.user?.fullName ?? "Member")
                            .font(.subheadline)
                        Spacer()
                        StatusBadge(paymentStatus: payment.status)
                    }
                }
            }
        }
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - All Cycles

    private var allCyclesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("All Cycles")
                .font(.headline)

            ForEach(cycles) { cycle in
                HStack {
                    Text("Cycle #\(cycle.cycleNumber)")
                        .font(.subheadline)
                    Spacer()
                    if cycle.isCompleted {
                        StatusBadge(text: "Completed", color: .green)
                    } else {
                        StatusBadge(text: "In Progress", color: .blue)
                    }
                }
            }
        }
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Owner Actions

    private var ownerActionsSection: some View {
        Button(role: .destructive) {
            showDeleteConfirm = true
        } label: {
            Label("Delete Group", systemImage: "trash")
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
        }
        .buttonStyle(.bordered)
        .tint(.red)
    }

    // MARK: - Actions

    private func loadAll() async {
        isLoading = group == nil
        do {
            async let groupReq: SavingsGroup = APIClient.shared.request(url: APIEndpoints.Groups.detail(groupId))
            async let cyclesReq: [Cycle] = APIClient.shared.request(url: APIEndpoints.Groups.cycles(groupId))

            let (g, c) = try await (groupReq, cyclesReq)
            group = g
            cycles = c
            currentCycle = c.first(where: { !$0.isCompleted })

            if isOwner && g.status == .PENDING && g.isFull {
                readiness = try? await APIClient.shared.request(url: APIEndpoints.Groups.readiness(groupId))
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    private func startGroup() async {
        isStarting = true
        defer { isStarting = false }
        do {
            group = try await APIClient.shared.request(
                url: APIEndpoints.Groups.start(groupId),
                method: "POST"
            )
            await loadAll()
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func deleteGroup() async {
        do {
            let _: SavingsGroup = try await APIClient.shared.request(
                url: APIEndpoints.Groups.detail(groupId),
                method: "DELETE"
            )
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

#Preview {
    NavigationStack {
        GroupDetailView(groupId: "test")
            .environment(AuthManager.shared)
    }
}
