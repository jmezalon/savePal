import SwiftUI

struct GroupsListView: View {
    @State private var groups: [SavingsGroup] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var showCreateGroup = false
    @State private var showJoinGroup = false

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    LoadingView(message: "Loading groups...")
                } else if groups.isEmpty {
                    EmptyStateView(
                        icon: "person.3",
                        title: "No Groups Yet",
                        message: "Create a new savings group or join one with an invite code.",
                        buttonTitle: "Create Group"
                    ) {
                        showCreateGroup = true
                    }
                } else {
                    groupsList
                }
            }
            .navigationTitle("Groups")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Menu {
                        Button {
                            showCreateGroup = true
                        } label: {
                            Label("Create Group", systemImage: "plus.circle")
                        }
                        Button {
                            showJoinGroup = true
                        } label: {
                            Label("Join Group", systemImage: "person.badge.plus")
                        }
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .refreshable {
                await loadGroups()
            }
            .task {
                await loadGroups()
            }
            .sheet(isPresented: $showCreateGroup) {
                CreateGroupView {
                    Task { await loadGroups() }
                }
            }
            .sheet(isPresented: $showJoinGroup) {
                JoinGroupView {
                    Task { await loadGroups() }
                }
            }
        }
    }

    private var groupsList: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(groups) { group in
                    NavigationLink(value: group.id) {
                        GroupCardView(group: group)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding()
        }
        .navigationDestination(for: String.self) { groupId in
            GroupDetailView(groupId: groupId)
        }
    }

    private func loadGroups() async {
        defer { isLoading = false }
        do {
            groups = try await APIClient.shared.request(url: APIEndpoints.Groups.base)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - Group Card

struct GroupCardView: View {
    let group: SavingsGroup

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(group.name)
                    .font(.headline)
                Spacer()
                StatusBadge(groupStatus: group.status)
            }

            if let description = group.description, !description.isEmpty {
                Text(description)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }

            HStack(spacing: 16) {
                Label("\(group.currentMembers)/\(group.maxMembers)", systemImage: "person.3")
                Label(group.frequency.displayName, systemImage: "calendar")
                Spacer()
                Text(group.formattedContribution)
                    .fontWeight(.semibold)
                    .foregroundStyle(Color.savePalBlue)
            }
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

#Preview {
    GroupsListView()
}
