import SwiftUI

struct ProfileView: View {
    @Environment(AuthManager.self) private var authManager
    @State private var showChangePassword = false
    @State private var showEditProfile = false
    @State private var showLogoutConfirm = false
    @State private var showDeleteConfirm = false
    @State private var isDeletingAccount = false
    @State private var deleteError: String?

    var body: some View {
        NavigationStack {
            List {
                // User Info
                if let user = authManager.currentUser {
                    Section {
                        HStack(spacing: 12) {
                            ZStack {
                                Circle()
                                    .fill(Color.savePalBlue.opacity(0.2))
                                Text(user.initials)
                                    .font(.title2)
                                    .fontWeight(.semibold)
                                    .foregroundStyle(Color.savePalBlue)
                            }
                            .frame(width: 56, height: 56)

                            VStack(alignment: .leading, spacing: 4) {
                                Text(user.fullName)
                                    .font(.headline)
                                Text(user.email)
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                                if let phone = user.phoneNumber {
                                    Text(phone)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                        .padding(.vertical, 4)
                    }

                    // Verification
                    Section("Verification") {
                        verificationRow(
                            icon: "envelope.fill",
                            title: "Email",
                            verified: user.emailVerified
                        )
                        verificationRow(
                            icon: "phone.fill",
                            title: "Phone",
                            verified: user.phoneVerified
                        )
                        verificationRow(
                            icon: "banknote.fill",
                            title: "Bank Account",
                            verified: user.stripeConnectOnboarded
                        )
                    }

                    // Trust Score
                    Section("Trust Score") {
                        HStack {
                            Text("Score")
                            Spacer()
                            Text("\(Int(user.trustScore))%")
                                .fontWeight(.semibold)
                                .foregroundStyle(user.trustScore >= 70 ? .green : user.trustScore >= 40 ? .orange : .red)
                        }
                    }
                }

                // Account Actions
                Section("Account") {
                    Button {
                        showEditProfile = true
                    } label: {
                        Label("Edit Profile", systemImage: "pencil")
                    }

                    Button {
                        showChangePassword = true
                    } label: {
                        Label("Change Password", systemImage: "lock")
                    }

                    NavigationLink {
                        NotificationPreferencesView()
                    } label: {
                        Label("Notification Preferences", systemImage: "bell")
                    }
                }

                // Payment
                Section("Payment") {
                    NavigationLink {
                        PaymentMethodsView()
                    } label: {
                        Label("Payment Methods", systemImage: "creditcard")
                    }

                    NavigationLink {
                        BankAccountView()
                    } label: {
                        Label("Bank Account (Payouts)", systemImage: "building.columns")
                    }
                }

                // Help & Support
                Section("Help") {
                    NavigationLink {
                        HelpView()
                    } label: {
                        Label("FAQ", systemImage: "questionmark.circle")
                    }
                }

                // Logout
                Section {
                    Button(role: .destructive) {
                        showLogoutConfirm = true
                    } label: {
                        Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                }

                // Delete Account
                Section {
                    Button(role: .destructive) {
                        showDeleteConfirm = true
                    } label: {
                        if isDeletingAccount {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                        } else {
                            Label("Delete Account", systemImage: "trash")
                                .foregroundStyle(.red)
                        }
                    }
                    .disabled(isDeletingAccount)
                } footer: {
                    Text("Permanently delete your account and all associated data. This cannot be undone.")
                }
            }
            .navigationTitle("Profile")
            .sheet(isPresented: $showEditProfile) {
                EditProfileView()
            }
            .sheet(isPresented: $showChangePassword) {
                ChangePasswordView()
            }
            .alert("Sign Out", isPresented: $showLogoutConfirm) {
                Button("Sign Out", role: .destructive) {
                    authManager.logout()
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("Are you sure you want to sign out?")
            }
            .alert("Delete Account", isPresented: $showDeleteConfirm) {
                Button("Delete", role: .destructive) {
                    Task { await performDeleteAccount() }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This will permanently delete your account and all your data. This action cannot be undone.")
            }
            .alert("Cannot Delete Account", isPresented: .init(
                get: { deleteError != nil },
                set: { if !$0 { deleteError = nil } }
            )) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(deleteError ?? "")
            }
        }
    }

    private func performDeleteAccount() async {
        isDeletingAccount = true
        defer { isDeletingAccount = false }
        do {
            try await authManager.deleteAccount()
        } catch let error as APIError {
            deleteError = error.errorDescription
        } catch {
            deleteError = error.localizedDescription
        }
    }

    private func verificationRow(icon: String, title: String, verified: Bool) -> some View {
        HStack {
            Image(systemName: icon)
                .foregroundStyle(verified ? .green : .secondary)
                .frame(width: 24)
            Text(title)
            Spacer()
            Image(systemName: verified ? "checkmark.circle.fill" : "xmark.circle")
                .foregroundStyle(verified ? .green : .red.opacity(0.6))
        }
    }
}

// MARK: - Placeholder Views (will be fleshed out in later phases)

struct NotificationPreferencesView: View {
    @Environment(AuthManager.self) private var authManager
    @State private var emailNotifications = true
    @State private var pushNotifications = true
    @State private var smsNotifications = false
    @State private var isSaving = false

    var body: some View {
        Form {
            Section("Notifications") {
                Toggle("Email Notifications", isOn: $emailNotifications)
                Toggle("Push Notifications", isOn: $pushNotifications)
                Toggle("SMS Notifications", isOn: $smsNotifications)
            }

            Section {
                Button {
                    Task { await savePreferences() }
                } label: {
                    if isSaving {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                    } else {
                        Text("Save Preferences")
                            .frame(maxWidth: .infinity)
                    }
                }
            }
        }
        .navigationTitle("Notifications")
        .onAppear {
            if let user = authManager.currentUser {
                emailNotifications = user.emailNotifications
                pushNotifications = user.pushNotifications
                smsNotifications = user.smsNotifications
            }
        }
    }

    private func savePreferences() async {
        isSaving = true
        defer { isSaving = false }
        do {
            let _: User = try await APIClient.shared.request(
                url: APIEndpoints.Auth.notifications,
                method: "PATCH",
                body: [
                    "emailNotifications": emailNotifications,
                    "pushNotifications": pushNotifications,
                    "smsNotifications": smsNotifications,
                ]
            )
            await authManager.refreshUser()
        } catch {
            // Handle error
        }
    }
}

struct EditProfileView: View {
    @Environment(AuthManager.self) private var authManager
    @Environment(\.dismiss) private var dismiss
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var phoneNumber = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Personal Information") {
                    TextField("First Name", text: $firstName)
                    TextField("Last Name", text: $lastName)
                    TextField("Phone Number", text: $phoneNumber)
                        .keyboardType(.phonePad)
                }

                if let error = errorMessage {
                    Section {
                        Text(error).foregroundStyle(.red).font(.subheadline)
                    }
                }
            }
            .navigationTitle("Edit Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task { await save() }
                    }
                    .disabled(isSaving || firstName.isEmpty || lastName.isEmpty)
                }
            }
            .onAppear {
                if let user = authManager.currentUser {
                    firstName = user.firstName
                    lastName = user.lastName
                    phoneNumber = user.phoneNumber ?? ""
                }
            }
        }
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }
        var body: [String: Any] = [
            "firstName": firstName.trimmingCharacters(in: .whitespaces),
            "lastName": lastName.trimmingCharacters(in: .whitespaces),
        ]
        if !phoneNumber.isEmpty {
            body["phoneNumber"] = phoneNumber
        }
        do {
            let _: User = try await APIClient.shared.request(
                url: APIEndpoints.Auth.profile,
                method: "PATCH",
                body: body
            )
            await authManager.refreshUser()
            dismiss()
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct ChangePasswordView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var currentPassword = ""
    @State private var newPassword = ""
    @State private var confirmPassword = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var successMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    SecureField("Current Password", text: $currentPassword)
                    SecureField("New Password (min 8 chars)", text: $newPassword)
                    SecureField("Confirm New Password", text: $confirmPassword)
                }

                if !newPassword.isEmpty && !confirmPassword.isEmpty && newPassword != confirmPassword {
                    Section {
                        Text("Passwords do not match")
                            .foregroundStyle(.red)
                            .font(.caption)
                    }
                }

                if let error = errorMessage {
                    Section { Text(error).foregroundStyle(.red).font(.subheadline) }
                }

                if let success = successMessage {
                    Section { Text(success).foregroundStyle(.green).font(.subheadline) }
                }

                Section {
                    Button {
                        Task { await changePassword() }
                    } label: {
                        if isLoading {
                            ProgressView().frame(maxWidth: .infinity)
                        } else {
                            Text("Change Password").frame(maxWidth: .infinity)
                        }
                    }
                    .disabled(isLoading || currentPassword.isEmpty || newPassword.count < 8 || newPassword != confirmPassword)
                }
            }
            .navigationTitle("Change Password")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private func changePassword() async {
        errorMessage = nil
        isLoading = true
        defer { isLoading = false }
        do {
            let message = try await APIClient.shared.requestMessage(
                url: APIEndpoints.Auth.changePassword,
                method: "POST",
                body: [
                    "currentPassword": currentPassword,
                    "newPassword": newPassword,
                ]
            )
            successMessage = message
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct PaymentMethodsView: View {
    @State private var methods: [PaymentMethod] = []
    @State private var isLoading = true

    var body: some View {
        Group {
            if isLoading {
                LoadingView()
            } else if methods.isEmpty {
                EmptyStateView(
                    icon: "creditcard",
                    title: "No Payment Methods",
                    message: "Add a card to make payments."
                )
            } else {
                List {
                    ForEach(methods) { method in
                        HStack {
                            Image(systemName: "creditcard.fill")
                                .foregroundStyle(.secondary)
                            Text(method.displayName)
                            Spacer()
                            if method.isDefault {
                                Text("Default")
                                    .font(.caption)
                                    .foregroundStyle(Color.savePalBlue)
                            }
                        }
                        .swipeActions(edge: .trailing) {
                            Button(role: .destructive) {
                                Task { await deleteMethod(method) }
                            } label: {
                                Label("Delete", systemImage: "trash")
                            }
                            if !method.isDefault {
                                Button {
                                    Task { await setDefault(method) }
                                } label: {
                                    Label("Default", systemImage: "star")
                                }
                                .tint(Color.savePalBlue)
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle("Payment Methods")
        .task { await loadMethods() }
        .refreshable { await loadMethods() }
    }

    private func loadMethods() async {
        defer { isLoading = false }
        do {
            methods = try await APIClient.shared.request(url: APIEndpoints.PaymentMethods.base)
        } catch {}
    }

    private func deleteMethod(_ method: PaymentMethod) async {
        do {
            _ = try await APIClient.shared.requestMessage(
                url: APIEndpoints.PaymentMethods.detail(method.id),
                method: "DELETE"
            )
            await loadMethods()
        } catch {}
    }

    private func setDefault(_ method: PaymentMethod) async {
        do {
            _ = try await APIClient.shared.requestMessage(
                url: APIEndpoints.PaymentMethods.setDefault(method.id),
                method: "PUT"
            )
            await loadMethods()
        } catch {}
    }
}

struct BankAccountView: View {
    @State private var connectStatus: ConnectStatus?
    @State private var isLoading = true

    var body: some View {
        Group {
            if isLoading {
                LoadingView()
            } else if let status = connectStatus, status.accountId != nil {
                bankStatusView(status)
            } else {
                EmptyStateView(
                    icon: "building.columns",
                    title: "No Bank Account",
                    message: "Set up a bank account to receive payouts."
                )
            }
        }
        .navigationTitle("Bank Account")
        .task { await loadStatus() }
    }

    private func bankStatusView(_ status: ConnectStatus) -> some View {
        List {
            Section("Status") {
                HStack {
                    Text("Transfers")
                    Spacer()
                    Text(status.transfersStatus ?? "Unknown")
                        .foregroundStyle(status.transfersStatus == "active" ? .green : .orange)
                }
                HStack {
                    Text("Payouts Enabled")
                    Spacer()
                    Image(systemName: status.payoutsEnabled == true ? "checkmark.circle.fill" : "xmark.circle")
                        .foregroundStyle(status.payoutsEnabled == true ? .green : .red)
                }
            }

            if let banks = status.bankAccounts, !banks.isEmpty {
                Section("Bank Accounts") {
                    ForEach(banks, id: \.id) { bank in
                        HStack {
                            Image(systemName: "building.columns.fill")
                                .foregroundStyle(.secondary)
                            VStack(alignment: .leading) {
                                Text(bank.bankName ?? "Bank")
                                    .font(.subheadline)
                                Text("····\(bank.last4 ?? "****")")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
        }
    }

    private func loadStatus() async {
        defer { isLoading = false }
        do {
            connectStatus = try await APIClient.shared.request(url: APIEndpoints.Connect.status)
        } catch {}
    }
}

#Preview {
    ProfileView()
        .environment(AuthManager.shared)
}
