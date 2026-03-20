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

    // Phone verification state
    @State private var smsConsentChecked = false
    @State private var isSendingCode = false
    @State private var showVerificationSheet = false
    @State private var verificationError: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Personal Information") {
                    TextField("First Name", text: $firstName)
                    TextField("Last Name", text: $lastName)
                    TextField("Phone Number", text: $phoneNumber)
                        .keyboardType(.phonePad)
                }

                // Phone Verification Section
                if let user = authManager.currentUser, !phoneNumber.isEmpty, !user.phoneVerified {
                    Section {
                        Toggle(isOn: $smsConsentChecked) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("SMS Consent")
                                    .font(.subheadline.weight(.medium))
                                Text("I agree to receive SMS verification codes from SavePal. Message and data rates may apply.")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }

                        Button {
                            Task { await sendVerificationCode() }
                        } label: {
                            if isSendingCode {
                                HStack(spacing: 8) {
                                    ProgressView()
                                    Text("Saving & sending code...")
                                        .foregroundStyle(.secondary)
                                }
                                .frame(maxWidth: .infinity)
                            } else {
                                Text("Send Verification Code")
                                    .frame(maxWidth: .infinity)
                            }
                        }
                        .disabled(!smsConsentChecked || isSendingCode)

                        if let err = verificationError {
                            Text(err).foregroundStyle(.red).font(.caption)
                        }
                    } header: {
                        Text("Phone Verification")
                    } footer: {
                        Text("Verify your phone number to increase your trust score.")
                    }
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
            .sheet(isPresented: $showVerificationSheet) {
                PhoneVerificationSheet(phoneNumber: phoneNumber)
            }
        }
    }

    private func sendVerificationCode() async {
        isSendingCode = true
        verificationError = nil
        defer { isSendingCode = false }

        do {
            // Auto-save profile (including phone number) before sending verification
            let body: [String: Any] = [
                "firstName": firstName.trimmingCharacters(in: .whitespaces),
                "lastName": lastName.trimmingCharacters(in: .whitespaces),
                "phoneNumber": phoneNumber,
            ]
            let _: User = try await APIClient.shared.request(
                url: APIEndpoints.Auth.profile,
                method: "PATCH",
                body: body
            )
            await authManager.refreshUser()

            _ = try await APIClient.shared.requestMessage(
                url: APIEndpoints.Auth.sendPhoneVerification,
                method: "POST"
            )
            showVerificationSheet = true
        } catch let error as APIError {
            verificationError = error.errorDescription
        } catch {
            verificationError = error.localizedDescription
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

// MARK: - Phone Verification Sheet

struct PhoneVerificationSheet: View {
    @Environment(AuthManager.self) private var authManager
    @Environment(\.dismiss) private var dismiss

    let phoneNumber: String

    @State private var digits: [String] = Array(repeating: "", count: 6)
    @FocusState private var focusedIndex: Int?
    @State private var isVerifying = false
    @State private var isResending = false
    @State private var errorMessage: String?
    @State private var successMessage: String?
    @State private var isVerified = false

    private var code: String { digits.joined() }
    private var isCodeComplete: Bool { code.count == 6 }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Spacer()

                // Icon
                ZStack {
                    Circle()
                        .fill(Color.savePalBlue.opacity(0.1))
                        .frame(width: 80, height: 80)
                    Image(systemName: isVerified ? "checkmark.circle.fill" : "phone.badge.checkmark")
                        .font(.system(size: 36))
                        .foregroundStyle(isVerified ? .green : Color.savePalBlue)
                }
                .padding(.bottom, 24)

                // Title
                Text(isVerified ? "Phone Verified!" : "Enter Verification Code")
                    .font(.title2.weight(.bold))
                    .padding(.bottom, 8)

                // Subtitle
                Text(isVerified ? "Your phone number has been verified successfully." : "We sent a 6-digit code to \(phoneNumber)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
                    .padding(.bottom, 32)

                if !isVerified {
                    // OTP Input Boxes
                    HStack(spacing: 10) {
                        ForEach(0..<6, id: \.self) { index in
                            OTPDigitBox(
                                digit: $digits[index],
                                isFocused: focusedIndex == index
                            )
                            .focused($focusedIndex, equals: index)
                            .onChange(of: digits[index]) { _, newValue in
                                handleDigitChange(at: index, newValue: newValue)
                            }
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 24)

                    // Error / Success messages
                    if let error = errorMessage {
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(.red)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 32)
                            .padding(.bottom, 16)
                    }

                    // Verify Button
                    Button {
                        Task { await verifyCode() }
                    } label: {
                        if isVerifying {
                            ProgressView()
                                .tint(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                        } else {
                            Text("Verify")
                                .fontWeight(.semibold)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                        }
                    }
                    .background(isCodeComplete ? Color.savePalBlue : Color.savePalBlue.opacity(0.4))
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .disabled(!isCodeComplete || isVerifying)
                    .padding(.horizontal, 24)
                    .padding(.bottom, 16)

                    // Resend
                    Button {
                        Task { await resendCode() }
                    } label: {
                        if isResending {
                            HStack(spacing: 6) {
                                ProgressView()
                                    .controlSize(.small)
                                Text("Sending...")
                            }
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        } else {
                            Text("Didn't receive a code? Resend")
                                .font(.subheadline)
                                .foregroundStyle(Color.savePalBlue)
                        }
                    }
                    .disabled(isResending)
                } else {
                    // Done button after verification
                    Button {
                        dismiss()
                    } label: {
                        Text("Done")
                            .fontWeight(.semibold)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                    }
                    .background(Color.savePalBlue)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .padding(.horizontal, 24)
                }

                Spacer()
                Spacer()
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    if !isVerified {
                        Button("Cancel") { dismiss() }
                    }
                }
            }
            .onAppear {
                focusedIndex = 0
            }
        }
    }

    private func handleDigitChange(at index: Int, newValue: String) {
        // Only allow single digits
        let filtered = String(newValue.filter { $0.isNumber }.prefix(1))
        if digits[index] != filtered {
            digits[index] = filtered
        }

        // Handle paste (multiple digits at once)
        if newValue.count > 1 {
            let allDigits = newValue.filter { $0.isNumber }
            for (offset, char) in allDigits.prefix(6 - index).enumerated() {
                digits[index + offset] = String(char)
            }
            let nextIndex = min(index + allDigits.count, 5)
            focusedIndex = nextIndex
            return
        }

        // Auto-advance to next field
        if !filtered.isEmpty && index < 5 {
            focusedIndex = index + 1
        }

        // Auto-verify when all 6 digits are entered
        if isCodeComplete && !isVerifying {
            Task { await verifyCode() }
        }
    }

    private func verifyCode() async {
        isVerifying = true
        errorMessage = nil
        defer { isVerifying = false }

        do {
            _ = try await APIClient.shared.requestMessage(
                url: APIEndpoints.Auth.verifyPhone,
                method: "POST",
                body: ["code": code]
            )
            await authManager.refreshUser()
            isVerified = true
        } catch let error as APIError {
            errorMessage = error.errorDescription
            // Clear digits on error so user can retry
            digits = Array(repeating: "", count: 6)
            focusedIndex = 0
        } catch {
            errorMessage = error.localizedDescription
            digits = Array(repeating: "", count: 6)
            focusedIndex = 0
        }
    }

    private func resendCode() async {
        isResending = true
        errorMessage = nil
        defer { isResending = false }

        do {
            _ = try await APIClient.shared.requestMessage(
                url: APIEndpoints.Auth.sendPhoneVerification,
                method: "POST"
            )
            errorMessage = nil
            digits = Array(repeating: "", count: 6)
            focusedIndex = 0
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - OTP Digit Box

private struct OTPDigitBox: View {
    @Binding var digit: String
    let isFocused: Bool

    var body: some View {
        TextField("", text: $digit)
            .keyboardType(.numberPad)
            .textContentType(.oneTimeCode)
            .multilineTextAlignment(.center)
            .font(.title2.weight(.semibold))
            .frame(width: 48, height: 56)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(isFocused ? Color.savePalBlue.opacity(0.05) : Color(.systemGray6))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isFocused ? Color.savePalBlue : (digit.isEmpty ? Color(.systemGray4) : Color.savePalBlue.opacity(0.5)), lineWidth: isFocused ? 2 : 1)
            )
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
    @State private var showAddCard = false

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
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    showAddCard = true
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showAddCard, onDismiss: {
            Task { await loadMethods() }
        }) {
            AddCardView()
        }
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

private enum DOBField: Hashable {
    case month, day, year
}

struct BankAccountView: View {
    @Environment(AuthManager.self) private var authManager
    @State private var connectStatus: ConnectStatus?
    @State private var isLoading = true
    @State private var showSetupForm = false

    // Setup form fields
    @State private var routingNumber = ""
    @State private var accountNumber = ""
    @State private var accountHolderName = ""
    @State private var dobMonth = ""
    @State private var dobDay = ""
    @State private var dobYear = ""
    @State private var addressLine1 = ""
    @State private var city = ""
    @State private var state = ""
    @State private var postalCode = ""
    @State private var ssnLast4 = ""
    @State private var isSubmitting = false
    @State private var errorMessage: String?
    @State private var successMessage: String?
    @FocusState private var setupDobFocus: DOBField?

    // Update verification form
    @State private var showUpdateVerification = false
    @State private var showReplaceBankConfirm = false
    @State private var verifyDobMonth = ""
    @State private var verifyDobDay = ""
    @State private var verifyDobYear = ""
    @State private var verifyAddressLine1 = ""
    @State private var verifyCity = ""
    @State private var verifyState = ""
    @State private var verifyPostalCode = ""
    @State private var verifySsnLast4 = ""
    @State private var isVerifySubmitting = false
    @State private var verifyError: String?
    @State private var verifySuccess: String?
    @FocusState private var verifyDobFocus: DOBField?

    var body: some View {
        Group {
            if isLoading {
                LoadingView()
            } else if showSetupForm {
                setupFormView
            } else if let status = connectStatus, status.accountId != nil {
                bankStatusView(status)
            } else {
                VStack(spacing: 16) {
                    EmptyStateView(
                        icon: "building.columns",
                        title: "No Bank Account",
                        message: "Set up a bank account to receive payouts."
                    )
                    Button("Set Up Bank Account") {
                        showSetupForm = true
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Color.savePalBlue)
                }
                .padding(.bottom, 32)
            }
        }
        .navigationTitle("Bank Account")
        .task { await loadStatus() }
        .refreshable { await loadStatus() }
    }

    private func bankStatusView(_ status: ConnectStatus) -> some View {
        List {
            // Verification warning
            if status.requiresVerification == true || status.transfersStatus != "active" {
                Section {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack(spacing: 8) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundStyle(.orange)
                            Text("Verification Required")
                                .font(.subheadline.weight(.semibold))
                        }
                        Text(verificationMessage(for: status))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 4)
                }

                Section {
                    Button {
                        prefillIdentityForm(from: status)
                        showUpdateVerification = true
                    } label: {
                        Label("Update Verification Info", systemImage: "person.text.rectangle")
                    }

                    Button {
                        showReplaceBankConfirm = true
                    } label: {
                        Label("Replace Bank Account", systemImage: "arrow.triangle.2.circlepath")
                    }
                }
            }

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

            if status.bankLast4 != nil || status.bankName != nil {
                Section("Bank Account") {
                    HStack {
                        Image(systemName: "building.columns.fill")
                            .foregroundStyle(.secondary)
                        VStack(alignment: .leading) {
                            Text(status.bankName ?? "Bank")
                                .font(.subheadline)
                            Text("····\(status.bankLast4 ?? "****")")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
        .sheet(isPresented: $showUpdateVerification) {
            NavigationStack {
                updateVerificationForm
                    .navigationTitle("Update Verification")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Cancel") { showUpdateVerification = false }
                        }
                    }
            }
        }
        .alert("Replace Bank Account", isPresented: $showReplaceBankConfirm) {
            Button("Replace", role: .destructive) {
                Task { await replaceBankAccount() }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This will remove your current bank account so you can set up a new one.")
        }
    }

    private func verificationMessage(for status: ConnectStatus) -> String {
        if let due = status.currentlyDue, !due.isEmpty {
            let readable = due.map { requirement in
                switch requirement {
                case "individual.dob.day", "individual.dob.month", "individual.dob.year":
                    return "date of birth"
                case "individual.address.line1", "individual.address.city", "individual.address.state", "individual.address.postal_code":
                    return "address"
                case "individual.id_number":
                    return "SSN"
                case "individual.ssn_last_4":
                    return "SSN last 4"
                case "individual.phone":
                    return "phone number"
                case "external_account":
                    return "bank account"
                default:
                    return requirement.replacingOccurrences(of: "individual.", with: "").replacingOccurrences(of: ".", with: " ")
                }
            }
            let unique = Array(Set(readable)).sorted()
            return "Stripe needs updated information: \(unique.joined(separator: ", "))."
        }
        return "Your identity verification is pending or was not successful. Please update your information."
    }

    private func prefillIdentityForm(from status: ConnectStatus) {
        // Clear form for fresh entry
        verifyDobMonth = ""
        verifyDobDay = ""
        verifyDobYear = ""
        verifyAddressLine1 = ""
        verifyCity = ""
        verifyState = ""
        verifyPostalCode = ""
        verifySsnLast4 = ""
        verifyError = nil
        verifySuccess = nil
    }

    private var updateVerificationForm: some View {
        Form {
            Section("Date of Birth") {
                HStack {
                    TextField("MM", text: $verifyDobMonth)
                        .keyboardType(.numberPad)
                        .frame(maxWidth: 50)
                        .focused($verifyDobFocus, equals: .month)
                        .onChange(of: verifyDobMonth) { _, newValue in
                            verifyDobMonth = String(newValue.filter { $0.isNumber }.prefix(2))
                            if verifyDobMonth.count == 2 { verifyDobFocus = .day }
                        }
                    Text("/")
                    TextField("DD", text: $verifyDobDay)
                        .keyboardType(.numberPad)
                        .frame(maxWidth: 50)
                        .focused($verifyDobFocus, equals: .day)
                        .onChange(of: verifyDobDay) { _, newValue in
                            verifyDobDay = String(newValue.filter { $0.isNumber }.prefix(2))
                            if verifyDobDay.count == 2 { verifyDobFocus = .year }
                        }
                    Text("/")
                    TextField("YYYY", text: $verifyDobYear)
                        .keyboardType(.numberPad)
                        .frame(maxWidth: 70)
                        .focused($verifyDobFocus, equals: .year)
                        .onChange(of: verifyDobYear) { _, newValue in
                            verifyDobYear = String(newValue.filter { $0.isNumber }.prefix(4))
                        }
                }
                TextField("SSN Last 4", text: $verifySsnLast4)
                    .keyboardType(.numberPad)
                    .onChange(of: verifySsnLast4) { _, newValue in
                        verifySsnLast4 = String(newValue.filter { $0.isNumber }.prefix(4))
                    }
            }

            Section("Address") {
                TextField("Street Address", text: $verifyAddressLine1)
                TextField("City", text: $verifyCity)
                TextField("State (e.g. CA)", text: $verifyState)
                    .textInputAutocapitalization(.characters)
                TextField("ZIP Code", text: $verifyPostalCode)
                    .keyboardType(.numberPad)
            }

            if let error = verifyError {
                Section { Text(error).foregroundStyle(.red).font(.subheadline) }
            }

            if let success = verifySuccess {
                Section { Text(success).foregroundStyle(.green).font(.subheadline) }
            }

            Section {
                Button {
                    Task { await submitVerificationUpdate() }
                } label: {
                    if isVerifySubmitting {
                        ProgressView().frame(maxWidth: .infinity)
                    } else {
                        Text("Submit").frame(maxWidth: .infinity)
                    }
                }
                .disabled(isVerifySubmitting || !isVerifyFormValid)
            }
        }
    }

    private var isVerifyFormValid: Bool {
        !verifyDobMonth.isEmpty && !verifyDobDay.isEmpty && !verifyDobYear.isEmpty &&
        verifySsnLast4.count == 4 &&
        !verifyAddressLine1.isEmpty && !verifyCity.isEmpty &&
        !verifyState.isEmpty && !verifyPostalCode.isEmpty
    }

    private func submitVerificationUpdate() async {
        isVerifySubmitting = true
        verifyError = nil
        verifySuccess = nil
        defer { isVerifySubmitting = false }

        let body: [String: Any] = [
            "dobMonth": verifyDobMonth,
            "dobDay": verifyDobDay,
            "dobYear": verifyDobYear,
            "ssnLast4": verifySsnLast4,
            "addressLine1": verifyAddressLine1,
            "addressCity": verifyCity,
            "addressState": verifyState,
            "addressPostalCode": verifyPostalCode,
        ]

        do {
            let message = try await APIClient.shared.requestMessage(
                url: APIEndpoints.Connect.verifyIdentity,
                method: "POST",
                body: body
            )
            verifySuccess = message
            await loadStatus()
            await authManager.refreshUser()
            // Auto-dismiss after a brief delay so user sees the success message
            try? await Task.sleep(nanoseconds: 1_500_000_000)
            showUpdateVerification = false
        } catch let error as APIError {
            verifyError = error.errorDescription
        } catch {
            verifyError = error.localizedDescription
        }
    }

    private func replaceBankAccount() async {
        isLoading = true
        do {
            _ = try await APIClient.shared.requestMessage(
                url: APIEndpoints.Connect.bankAccount,
                method: "DELETE"
            )
            connectStatus = nil
            showSetupForm = true
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    private var setupFormView: some View {
        Form {
            Section("Bank Details") {
                TextField("Routing Number (9 digits)", text: $routingNumber)
                    .keyboardType(.numberPad)
                TextField("Account Number", text: $accountNumber)
                    .keyboardType(.numberPad)
                TextField("Account Holder Name", text: $accountHolderName)
            }

            Section("Identity Verification") {
                HStack {
                    TextField("MM", text: $dobMonth)
                        .keyboardType(.numberPad)
                        .frame(maxWidth: 50)
                        .focused($setupDobFocus, equals: .month)
                        .onChange(of: dobMonth) { _, newValue in
                            dobMonth = String(newValue.filter { $0.isNumber }.prefix(2))
                            if dobMonth.count == 2 { setupDobFocus = .day }
                        }
                    Text("/")
                    TextField("DD", text: $dobDay)
                        .keyboardType(.numberPad)
                        .frame(maxWidth: 50)
                        .focused($setupDobFocus, equals: .day)
                        .onChange(of: dobDay) { _, newValue in
                            dobDay = String(newValue.filter { $0.isNumber }.prefix(2))
                            if dobDay.count == 2 { setupDobFocus = .year }
                        }
                    Text("/")
                    TextField("YYYY", text: $dobYear)
                        .keyboardType(.numberPad)
                        .frame(maxWidth: 70)
                        .focused($setupDobFocus, equals: .year)
                        .onChange(of: dobYear) { _, newValue in
                            dobYear = String(newValue.filter { $0.isNumber }.prefix(4))
                        }
                }
                TextField("SSN Last 4", text: $ssnLast4)
                    .keyboardType(.numberPad)
                    .onChange(of: ssnLast4) { _, newValue in
                        ssnLast4 = String(newValue.filter { $0.isNumber }.prefix(4))
                    }
            }

            Section("Address") {
                TextField("Street Address", text: $addressLine1)
                TextField("City", text: $city)
                TextField("State (e.g. CA)", text: $state)
                    .textInputAutocapitalization(.characters)
                TextField("ZIP Code", text: $postalCode)
                    .keyboardType(.numberPad)
            }

            if let error = errorMessage {
                Section {
                    Text(error).foregroundStyle(.red).font(.subheadline)
                }
            }

            if let success = successMessage {
                Section {
                    Text(success).foregroundStyle(.green).font(.subheadline)
                }
            }

            Section {
                Button {
                    Task { await submitSetup() }
                } label: {
                    if isSubmitting {
                        ProgressView().frame(maxWidth: .infinity)
                    } else {
                        Text("Submit").frame(maxWidth: .infinity)
                    }
                }
                .disabled(isSubmitting || !isFormValid)
            }
        }
    }

    private var isFormValid: Bool {
        routingNumber.count == 9 &&
        !accountNumber.isEmpty &&
        !accountHolderName.isEmpty
    }

    private func submitSetup() async {
        isSubmitting = true
        errorMessage = nil
        successMessage = nil
        defer { isSubmitting = false }

        var body: [String: Any] = [
            "routingNumber": routingNumber,
            "accountNumber": accountNumber,
            "accountHolderName": accountHolderName,
        ]

        if !ssnLast4.isEmpty { body["ssnLast4"] = ssnLast4 }
        if !dobMonth.isEmpty && !dobDay.isEmpty && !dobYear.isEmpty {
            body["dobMonth"] = dobMonth
            body["dobDay"] = dobDay
            body["dobYear"] = dobYear
        }
        if !addressLine1.isEmpty {
            body["addressLine1"] = addressLine1
            body["addressCity"] = city
            body["addressState"] = state
            body["addressPostalCode"] = postalCode
        }

        do {
            let _: ConnectSetupResponse = try await APIClient.shared.request(
                url: APIEndpoints.Connect.setup,
                method: "POST",
                body: body
            )
            successMessage = "Bank account set up successfully!"
            showSetupForm = false
            await loadStatus()
            await authManager.refreshUser()
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func loadStatus() async {
        if showSetupForm { isLoading = false; return }
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
