import SwiftUI

struct JoinGroupView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var inviteCode = ""
    @State private var autoPaymentConsent = false
    @State private var isLoading = false
    @State private var errorMessage: String?

    var onJoined: () -> Void

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Image(systemName: "person.badge.plus")
                    .font(.system(size: 48))
                    .foregroundStyle(Color.savePalBlue)
                    .padding(.top, 32)

                Text("Join a Group")
                    .font(.title2)
                    .fontWeight(.bold)

                Text("Enter the invite code shared by the group owner to join their savings group.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)

                if let error = errorMessage {
                    ErrorBanner(message: error) { errorMessage = nil }
                }

                TextField("Invite Code", text: $inviteCode)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .padding()
                    .background(.quaternary)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .padding(.horizontal)

                Toggle(isOn: $autoPaymentConsent) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Enable Auto-Payment")
                            .font(.subheadline)
                            .fontWeight(.medium)
                        Text("Automatically pay contributions when due using your default payment method.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .tint(Color.savePalBlue)
                .padding(.horizontal)

                Button {
                    Task { await joinGroup() }
                } label: {
                    if isLoading {
                        ProgressView().tint(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                    } else {
                        Text("Join Group")
                            .fontWeight(.semibold)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(Color.savePalBlue)
                .disabled(isLoading || inviteCode.isEmpty)
                .padding(.horizontal)

                Spacer()
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private func joinGroup() async {
        errorMessage = nil
        isLoading = true
        defer { isLoading = false }

        do {
            let _: Membership = try await APIClient.shared.request(
                url: APIEndpoints.Groups.join,
                method: "POST",
                body: [
                    "inviteCode": inviteCode.trimmingCharacters(in: .whitespaces),
                    "autoPaymentConsent": autoPaymentConsent,
                ]
            )
            onJoined()
            dismiss()
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

#Preview {
    JoinGroupView {}
}
