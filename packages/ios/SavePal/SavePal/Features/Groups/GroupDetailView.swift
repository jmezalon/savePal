import SwiftUI

struct IdentifiableString: Identifiable {
    let id: String
    var value: String { id }
    init(_ value: String) { self.id = value }
}

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
    @State private var selectedPaymentId: IdentifiableString?

    // Debt state
    @State private var debtInfo: DebtInfo?
    @State private var showPayDebt = false

    // Reorder state
    @State private var isReordering = false
    @State private var reorderMemberships: [Membership] = []
    @State private var reorderLoading = false

    // Bidding state
    @State private var bids: [Bid] = []
    @State private var bidAmount: String = ""
    @State private var bidLoading = false
    @State private var bidError: String?

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
        .sheet(item: $selectedPaymentId) { item in
            MakePaymentView(paymentId: item.value) {
                Task { await loadAll() }
            }
        }
        .sheet(isPresented: $showPayDebt) {
            PayDebtView(groupId: groupId) {
                Task { await loadAll() }
            }
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

                // Debt Banner
                if group.status == .ACTIVE, let debt = debtInfo, debt.outstandingDebt > 0 {
                    debtBanner(debt)
                }

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

                // Bidding Section
                if let cycle = currentCycle, group.payoutMethod == .BIDDING, cycle.biddingStatus != nil {
                    biddingSection(cycle, group: group)
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

    // MARK: - Debt Banner

    private func debtBanner(_ debt: DebtInfo) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(Color.savePalAmber)
                Text("Outstanding Debt")
                    .font(.headline)
                    .foregroundStyle(Color.savePalAmber)
                Spacer()
            }

            Text("You have \(debt.outstandingDebt.formattedCurrency) in unpaid contributions from \(debt.debtPayments.count) missed payment\(debt.debtPayments.count == 1 ? "" : "s").")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Button {
                showPayDebt = true
            } label: {
                Text("Pay Now")
                    .fontWeight(.semibold)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
            }
            .buttonStyle(.borderedProminent)
            .tint(Color.savePalAmber)
        }
        .padding()
        .background(Color.savePalAmber.opacity(0.1))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.savePalAmber.opacity(0.3)))
        .clipShape(RoundedRectangle(cornerRadius: 12))
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
                    item: "You've been invited to join \"\(group.name)\" on SavePal!\n\nHere's your access code: \(group.inviteCode)\n\nTo join, enter the code at: https://save-pals.com/groups/join\n\nPlease do not share this code with anyone else. Before joining, make sure to add your payment method via your profile: https://save-pals.com/profile",
                    subject: Text("Join my SavePal group"),
                    message: Text("Join \(group.name) on SavePal")
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
            HStack {
                Text("Members")
                    .font(.headline)
                Spacer()
                if isOwner && group.status == .PENDING && (group.memberships?.count ?? 0) > 1 {
                    if isReordering {
                        HStack(spacing: 8) {
                            Button("Cancel") {
                                isReordering = false
                            }
                            .font(.subheadline)
                            .foregroundStyle(.secondary)

                            Button {
                                Task { await saveReorder() }
                            } label: {
                                if reorderLoading {
                                    ProgressView().controlSize(.small)
                                } else {
                                    Text("Save")
                                }
                            }
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .disabled(reorderLoading)
                        }
                    } else {
                        Button("Reorder") {
                            reorderMemberships = (group.memberships ?? []).sorted { $0.payoutPosition < $1.payoutPosition }
                            isReordering = true
                        }
                        .font(.subheadline)
                    }
                }
            }

            if isReordering {
                ForEach(Array(reorderMemberships.enumerated()), id: \.element.id) { index, membership in
                    HStack {
                        VStack(spacing: 4) {
                            Button {
                                moveMember(at: index, direction: .up)
                            } label: {
                                Image(systemName: "chevron.up")
                                    .font(.caption)
                            }
                            .disabled(index == 0)

                            Button {
                                moveMember(at: index, direction: .down)
                            } label: {
                                Image(systemName: "chevron.down")
                                    .font(.caption)
                            }
                            .disabled(index == reorderMemberships.count - 1)
                        }
                        .foregroundStyle(Color.savePalBlue)

                        memberRow(membership)
                    }
                    .padding(6)
                    .background(Color.savePalBlue.opacity(0.05))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            } else if let memberships = group.memberships {
                ForEach(memberships.sorted { $0.payoutPosition < $1.payoutPosition }) { membership in
                    memberRow(membership)
                }
            }
        }
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func trustScoreColor(_ score: Double) -> Color {
        if score >= 80 { return .green }
        if score >= 60 { return .yellow }
        if score >= 40 { return .orange }
        return .red
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
                    if let score = membership.user?.trustScore {
                        HStack(spacing: 2) {
                            Image(systemName: "shield.fill")
                                .font(.system(size: 8))
                            Text("\(Int(score))")
                                .font(.caption2)
                                .fontWeight(.medium)
                        }
                        .padding(.horizontal, 5)
                        .padding(.vertical, 2)
                        .background(trustScoreColor(score).opacity(0.15))
                        .foregroundStyle(trustScoreColor(score))
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

    /// Groups payments by member for the cycle summary
    private func memberPaymentGroups(from payments: [Payment]) -> [(user: MemberUser, payments: [Payment])] {
        var grouped: [String: (user: MemberUser, payments: [Payment])] = [:]
        for payment in payments {
            let key = payment.userId
            if grouped[key] == nil {
                grouped[key] = (user: payment.user ?? MemberUser(id: payment.userId, firstName: "Unknown", lastName: "Member"), payments: [])
            }
            grouped[key]?.payments.append(payment)
        }
        return grouped.values
            .sorted { $0.payments.first?.contributionPeriod ?? 0 < $1.payments.first?.contributionPeriod ?? 0 }
    }

    /// Returns the next upcoming contribution due date from pending payments
    private func nextContributionDueDate(from payments: [Payment]) -> String? {
        let now = Date()
        let pendingWithDates = payments
            .filter { $0.status == .PENDING && $0.dueDate != nil }
            .sorted { ($0.dueDate ?? "") < ($1.dueDate ?? "") }

        // Find the first pending payment whose due date is in the future (or closest)
        if let next = pendingWithDates.first(where: { ($0.dueDate?.toDate ?? .distantPast) >= now }) {
            return next.dueDate
        }
        // If all due dates are past, show the latest one
        return pendingWithDates.last?.dueDate
    }

    private func currentCycleSection(_ cycle: Cycle) -> some View {
        let payments = cycle.payments ?? []
        let totalPayments = payments.count
        let completedPayments = payments.filter { $0.status == .COMPLETED }.count
        let progress = totalPayments > 0 ? Double(completedPayments) / Double(totalPayments) : 0
        let memberGroups = memberPaymentGroups(from: payments)
        let nextDue = nextContributionDueDate(from: payments)

        return VStack(alignment: .leading, spacing: 16) {
            // Header with cycle info and progress ring
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Cycle \(cycle.cycleNumber)")
                        .font(.title3)
                        .fontWeight(.bold)

                    if let nextDue = nextDue {
                        HStack(spacing: 4) {
                            Image(systemName: "calendar")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text("Next due: \(nextDue.formattedDate)")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    }

                    Text("Payout: \(cycle.totalAmount.formattedCurrency)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                // Progress ring
                ZStack {
                    Circle()
                        .stroke(Color.gray.opacity(0.2), lineWidth: 5)
                    Circle()
                        .trim(from: 0, to: progress)
                        .stroke(Color.savePalBlue, style: StrokeStyle(lineWidth: 5, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                        .animation(.easeInOut(duration: 0.5), value: progress)
                    VStack(spacing: 0) {
                        Text("\(completedPayments)")
                            .font(.caption)
                            .fontWeight(.bold)
                        Text("/\(totalPayments)")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
                .frame(width: 50, height: 50)
            }

            // Contribution period progress bar
            if let firstMemberPayments = memberGroups.first?.payments, firstMemberPayments.count > 1 {
                let periods = firstMemberPayments.count
                VStack(alignment: .leading, spacing: 6) {
                    Text("Contribution Periods")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    HStack(spacing: 4) {
                        ForEach(1...periods, id: \.self) { period in
                            let periodPayments = payments.filter { $0.contributionPeriod == period }
                            let periodCompleted = periodPayments.filter { $0.status == .COMPLETED }.count
                            let periodTotal = periodPayments.count
                            let allDone = periodCompleted == periodTotal

                            VStack(spacing: 2) {
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(allDone ? Color.green : (periodPayments.contains { $0.status == .COMPLETED } ? Color.green.opacity(0.4) : Color.gray.opacity(0.2)))
                                    .frame(height: 6)
                                Text("Wk \(period)")
                                    .font(.system(size: 9))
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }

            Divider()

            // Member summary rows
            ForEach(Array(memberGroups.enumerated()), id: \.offset) { _, memberGroup in
                memberCycleRow(memberGroup.user, payments: memberGroup.payments)
            }
        }
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func memberCycleRow(_ memberUser: MemberUser, payments: [Payment]) -> some View {
        let completed = payments.filter { $0.status == .COMPLETED }.count
        let total = payments.count
        let isCurrentUser = memberUser.id == authManager.currentUser?.id
        let nextPending = payments.first { $0.status == .PENDING }

        return HStack(spacing: 10) {
            // Avatar
            ZStack {
                Circle()
                    .fill(isCurrentUser ? Color.savePalBlue.opacity(0.3) : Color.savePalBlue.opacity(0.15))
                Text(memberUser.initials)
                    .font(.caption2)
                    .fontWeight(.semibold)
                    .foregroundStyle(Color.savePalBlue)
            }
            .frame(width: 32, height: 32)

            VStack(alignment: .leading, spacing: 2) {
                Text(isCurrentUser ? "You" : memberUser.fullName)
                    .font(.subheadline)
                    .fontWeight(isCurrentUser ? .semibold : .regular)

                // Mini progress bar
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 2)
                            .fill(Color.gray.opacity(0.15))
                            .frame(height: 4)
                        RoundedRectangle(cornerRadius: 2)
                            .fill(completed == total ? Color.green : Color.savePalBlue)
                            .frame(width: geo.size.width * CGFloat(completed) / CGFloat(max(total, 1)), height: 4)
                    }
                }
                .frame(height: 4)
            }

            Spacer()

            // Status: show count or action button
            if completed == total {
                StatusBadge(text: "Done", color: .green)
            } else if isCurrentUser, let pendingPayment = nextPending {
                Button("Pay Now") {
                    selectedPaymentId = IdentifiableString(pendingPayment.id)
                }
                .font(.caption)
                .buttonStyle(.borderedProminent)
                .tint(Color.savePalBlue)
                .controlSize(.small)
            } else {
                Text("\(completed)/\(total)")
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)
            }
        }
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

    // MARK: - Bidding Section

    private func biddingSection(_ cycle: Cycle, group: SavingsGroup) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "dollarsign.circle")
                    .foregroundStyle(.orange)
                Text(cycle.biddingStatus == .OPEN ? "Bidding Open" : "Bidding Closed")
                    .font(.headline)
                Spacer()
                if cycle.biddingStatus == .OPEN {
                    Text("Live")
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(.green.opacity(0.15))
                        .foregroundStyle(.green)
                        .clipShape(Capsule())
                }
            }

            if cycle.biddingStatus == .OPEN {
                Text("Place your bid — the member willing to pay the highest fee wins this cycle's payout. The fee is deducted from your payout (\(cycle.totalAmount.formattedCurrency)).")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                // Bid form
                HStack(spacing: 8) {
                    HStack {
                        Text("$")
                            .foregroundStyle(.secondary)
                        TextField("Amount", text: $bidAmount)
                            .keyboardType(.decimalPad)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .background(Color(.systemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(.orange.opacity(0.3)))

                    Button {
                        Task { await placeBid(cycleId: cycle.id) }
                    } label: {
                        if bidLoading {
                            ProgressView().controlSize(.small).tint(.white)
                        } else {
                            Text("Bid")
                                .fontWeight(.semibold)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(.orange)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .disabled(bidLoading || bidAmount.isEmpty)
                }

                if let bidError = bidError {
                    Text(bidError)
                        .font(.caption)
                        .foregroundStyle(.red)
                }
            }

            // Bids list
            if !bids.isEmpty {
                Divider()
                Text("\(bids.count) bid\(bids.count == 1 ? "" : "s") placed")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                ForEach(bids) { bid in
                    HStack {
                        ZStack {
                            Circle()
                                .fill(.orange.opacity(0.15))
                            Text("\(bid.user?.firstName.prefix(1) ?? "?")\(bid.user?.lastName?.prefix(1) ?? "")")
                                .font(.caption2)
                                .fontWeight(.semibold)
                                .foregroundStyle(.orange)
                        }
                        .frame(width: 28, height: 28)

                        Text(bid.userId == authManager.currentUser?.id ? "You" : (bid.user?.firstName ?? "Unknown"))
                            .font(.subheadline)

                        Spacer()

                        if let amount = bid.amount {
                            Text(String(format: "$%.2f", amount))
                                .font(.subheadline)
                                .fontWeight(.bold)
                                .foregroundStyle(.orange)
                        }
                    }
                    .padding(8)
                    .background(Color(.systemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }

            // Resolve button (owner only)
            if isOwner && cycle.biddingStatus == .OPEN && !bids.isEmpty {
                Button {
                    Task { await resolveBidding(cycleId: cycle.id) }
                } label: {
                    if bidLoading {
                        ProgressView().tint(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                    } else {
                        Text("Resolve Bidding (Highest Bidder Wins)")
                            .fontWeight(.semibold)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(.green)
                .disabled(bidLoading)
            }

            // Winner display
            if cycle.biddingStatus == .CLOSED, let recipientId = cycle.recipientId {
                HStack {
                    Image(systemName: "trophy.fill")
                        .foregroundStyle(.yellow)
                    Text("Winner: ")
                        .font(.subheadline)
                    Text(recipientId == authManager.currentUser?.id
                         ? "You"
                         : (group.memberships?.first { $0.userId == recipientId }?.user?.firstName ?? "Someone else"))
                        .font(.subheadline)
                        .fontWeight(.semibold)
                }
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(.green.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }
        }
        .padding()
        .background(.orange.opacity(0.05))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(.orange.opacity(0.2)))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Reorder Helpers

    private enum MoveDirection { case up, down }

    private func moveMember(at index: Int, direction: MoveDirection) {
        let swapIndex = direction == .up ? index - 1 : index + 1
        guard swapIndex >= 0 && swapIndex < reorderMemberships.count else { return }

        var list = reorderMemberships
        let tempPos = list[index].payoutPosition
        list[index] = Membership(
            id: list[index].id, groupId: list[index].groupId, userId: list[index].userId,
            role: list[index].role, payoutPosition: list[swapIndex].payoutPosition,
            joinedAt: list[index].joinedAt, isActive: list[index].isActive,
            autoPaymentConsented: list[index].autoPaymentConsented,
            autoPaymentConsentedAt: list[index].autoPaymentConsentedAt,
            outstandingDebt: list[index].outstandingDebt,
            debtPaymentIds: list[index].debtPaymentIds,
            user: list[index].user
        )
        list[swapIndex] = Membership(
            id: list[swapIndex].id, groupId: list[swapIndex].groupId, userId: list[swapIndex].userId,
            role: list[swapIndex].role, payoutPosition: tempPos,
            joinedAt: list[swapIndex].joinedAt, isActive: list[swapIndex].isActive,
            autoPaymentConsented: list[swapIndex].autoPaymentConsented,
            autoPaymentConsentedAt: list[swapIndex].autoPaymentConsentedAt,
            outstandingDebt: list[swapIndex].outstandingDebt,
            debtPaymentIds: list[swapIndex].debtPaymentIds,
            user: list[swapIndex].user
        )
        reorderMemberships = list.sorted { $0.payoutPosition < $1.payoutPosition }
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

            // Fetch debt info for active groups
            if g.status == .ACTIVE {
                debtInfo = try? await APIClient.shared.request(url: APIEndpoints.Payments.debtInfo(groupId))
            }

            // Fetch bids if current cycle has bidding
            if let current = currentCycle, current.biddingStatus != nil {
                await fetchBids(cycleId: current.id)
            }

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

    // MARK: - Reorder Actions

    private func saveReorder() async {
        reorderLoading = true
        defer { reorderLoading = false }

        let positions = reorderMemberships.map { membership -> [String: Any] in
            ["userId": membership.userId, "payoutPosition": membership.payoutPosition]
        }

        do {
            let _: [Membership] = try await APIClient.shared.request(
                url: APIEndpoints.Groups.reorder(groupId),
                method: "PUT",
                body: ["positions": positions]
            )
            isReordering = false
            await loadAll()
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Bidding Actions

    private func fetchBids(cycleId: String) async {
        do {
            bids = try await APIClient.shared.request(url: APIEndpoints.Cycles.bids(cycleId))
        } catch {
            // Fail silently
        }
    }

    private func placeBid(cycleId: String) async {
        guard let amount = Double(bidAmount), amount > 0 else {
            bidError = "Enter a valid amount"
            return
        }
        bidLoading = true
        bidError = nil
        defer { bidLoading = false }

        do {
            let _: Bid = try await APIClient.shared.request(
                url: APIEndpoints.Cycles.bids(cycleId),
                method: "POST",
                body: ["amount": amount]
            )
            bidAmount = ""
            await fetchBids(cycleId: cycleId)
        } catch let error as APIError {
            bidError = error.errorDescription
        } catch {
            bidError = error.localizedDescription
        }
    }

    private func resolveBidding(cycleId: String) async {
        bidLoading = true
        defer { bidLoading = false }

        do {
            let _: BidResolutionResult = try await APIClient.shared.request(
                url: APIEndpoints.Cycles.resolveBids(cycleId),
                method: "POST"
            )
            await loadAll()
        } catch let error as APIError {
            errorMessage = error.errorDescription
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
