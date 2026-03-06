import SwiftUI
import AuthenticationServices

struct RegisterView: View {
    @Environment(AuthManager.self) private var authManager
    @Environment(\.dismiss) private var dismiss
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var phoneNumber = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    private var isFormValid: Bool {
        !firstName.isEmpty && !lastName.isEmpty && !email.isEmpty
        && password.count >= 8 && password == confirmPassword
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 8) {
                    Text("Create Account")
                        .font(.title)
                        .fontWeight(.bold)
                    Text("Join SavePals and start saving together")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .padding(.top, 20)

                if let error = errorMessage {
                    ErrorBanner(message: error) {
                        errorMessage = nil
                    }
                }

                // Form
                VStack(spacing: 16) {
                    HStack(spacing: 12) {
                        TextField("First Name", text: $firstName)
                            .textContentType(.givenName)
                            .padding()
                            .background(.quaternary)
                            .clipShape(RoundedRectangle(cornerRadius: 10))

                        TextField("Last Name", text: $lastName)
                            .textContentType(.familyName)
                            .padding()
                            .background(.quaternary)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }

                    TextField("Email", text: $email)
                        .textContentType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.emailAddress)
                        .autocorrectionDisabled()
                        .padding()
                        .background(.quaternary)
                        .clipShape(RoundedRectangle(cornerRadius: 10))

                    TextField("Phone Number (optional)", text: $phoneNumber)
                        .textContentType(.telephoneNumber)
                        .keyboardType(.phonePad)
                        .padding()
                        .background(.quaternary)
                        .clipShape(RoundedRectangle(cornerRadius: 10))

                    SecureField("Password (min 8 characters)", text: $password)
                        .textContentType(.newPassword)
                        .padding()
                        .background(.quaternary)
                        .clipShape(RoundedRectangle(cornerRadius: 10))

                    SecureField("Confirm Password", text: $confirmPassword)
                        .textContentType(.newPassword)
                        .padding()
                        .background(.quaternary)
                        .clipShape(RoundedRectangle(cornerRadius: 10))

                    if !password.isEmpty && !confirmPassword.isEmpty && password != confirmPassword {
                        Text("Passwords do not match")
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                }
                .padding(.horizontal)

                // Register Button
                Button {
                    Task { await register() }
                } label: {
                    if isLoading {
                        ProgressView()
                            .tint(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                    } else {
                        Text("Create Account")
                            .fontWeight(.semibold)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(Color.savePalBlue)
                .disabled(isLoading || !isFormValid)
                .padding(.horizontal)

                // Divider
                HStack {
                    Rectangle()
                        .fill(Color.secondary.opacity(0.3))
                        .frame(height: 1)
                    Text("or")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Rectangle()
                        .fill(Color.secondary.opacity(0.3))
                        .frame(height: 1)
                }
                .padding(.horizontal)

                // Sign in with Apple
                SignInWithAppleButton(.signUp) { request in
                    request.requestedScopes = [.fullName, .email]
                } onCompletion: { result in
                    Task { await handleAppleSignIn(result) }
                }
                .signInWithAppleButtonStyle(.black)
                .frame(height: 50)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .padding(.horizontal)

                // Sign up with Google
                Button {
                    Task { await handleGoogleSignIn() }
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "g.circle.fill")
                            .font(.title2)
                        Text("Sign up with Google")
                            .fontWeight(.medium)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                }
                .buttonStyle(.bordered)
                .tint(.primary)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .padding(.horizontal)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
    }

    private func register() async {
        errorMessage = nil
        isLoading = true
        defer { isLoading = false }

        do {
            try await authManager.register(
                email: email.trimmingCharacters(in: .whitespaces),
                password: password,
                firstName: firstName.trimmingCharacters(in: .whitespaces),
                lastName: lastName.trimmingCharacters(in: .whitespaces),
                phoneNumber: phoneNumber.isEmpty ? nil : phoneNumber
            )
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func handleGoogleSignIn() async {
        errorMessage = nil
        isLoading = true
        defer { isLoading = false }

        do {
            let idToken = try await GoogleSignInHelper.signIn()
            try await authManager.googleLogin(idToken: idToken)
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            let nsError = error as NSError
            if nsError.domain == "com.google.GIDSignIn" && nsError.code == -5 { return }
            errorMessage = error.localizedDescription
        }
    }

    private func handleAppleSignIn(_ result: Result<ASAuthorization, Error>) async {
        switch result {
        case .success(let authorization):
            guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                  let identityTokenData = credential.identityToken,
                  let identityToken = String(data: identityTokenData, encoding: .utf8) else {
                errorMessage = "Failed to get Apple credential"
                return
            }

            errorMessage = nil
            isLoading = true
            defer { isLoading = false }

            do {
                try await authManager.appleLogin(
                    identityToken: identityToken,
                    fullName: credential.fullName
                )
            } catch let error as APIError {
                errorMessage = error.errorDescription
            } catch {
                errorMessage = error.localizedDescription
            }

        case .failure(let error):
            if (error as NSError).code == ASAuthorizationError.canceled.rawValue { return }
            errorMessage = error.localizedDescription
        }
    }
}

#Preview {
    NavigationStack {
        RegisterView()
            .environment(AuthManager.shared)
    }
}
