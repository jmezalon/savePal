import SwiftUI

struct CreateGroupView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var description = ""
    @State private var contributionAmount = ""
    @State private var frequency: Frequency = .MONTHLY
    @State private var payoutFrequency: Frequency = .MONTHLY
    @State private var payoutMethod: PayoutMethod = .SEQUENTIAL
    @State private var maxMembers = "5"
    @State private var waiverCode = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var feeStatus: CreationFeeStatus?
    @State private var waiverValid: Bool?
    @State private var showPayoutFrequency = false

    var onCreated: () -> Void

    private var isFormValid: Bool {
        !name.isEmpty && !contributionAmount.isEmpty
        && (Double(contributionAmount) ?? 0) > 0
        && (Int(maxMembers) ?? 0) >= 2
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Group Details") {
                    TextField("Group Name", text: $name)
                    TextField("Description (optional)", text: $description)
                }

                Section("Contribution") {
                    HStack {
                        Text("$")
                        TextField("Amount", text: $contributionAmount)
                            .keyboardType(.decimalPad)
                    }

                    Picker("Frequency", selection: $frequency) {
                        ForEach(Frequency.allCases, id: \.self) { freq in
                            Text(freq.displayName).tag(freq)
                        }
                    }

                    Toggle("Different Payout Frequency", isOn: $showPayoutFrequency)

                    if showPayoutFrequency {
                        Picker("Payout Frequency", selection: $payoutFrequency) {
                            ForEach(Frequency.allCases, id: \.self) { freq in
                                Text(freq.displayName).tag(freq)
                            }
                        }
                    }
                }

                Section("Settings") {
                    Picker("Payout Method", selection: $payoutMethod) {
                        ForEach(PayoutMethod.allCases, id: \.self) { method in
                            VStack(alignment: .leading) {
                                Text(method.displayName)
                            }
                            .tag(method)
                        }
                    }

                    HStack {
                        Text("Max Members")
                        Spacer()
                        TextField("2-50", text: $maxMembers)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 60)
                    }
                }

                if let feeStatus = feeStatus, feeStatus.feeRequired {
                    Section("Creation Fee") {
                        Text("A $2.99 creation fee applies.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)

                        TextField("Waiver Code (optional)", text: $waiverCode)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .onChange(of: waiverCode) { _, _ in
                                waiverValid = nil
                            }

                        if !waiverCode.isEmpty {
                            Button("Validate Code") {
                                Task { await validateWaiverCode() }
                            }
                        }

                        if let valid = waiverValid {
                            HStack {
                                Image(systemName: valid ? "checkmark.circle.fill" : "xmark.circle.fill")
                                    .foregroundStyle(valid ? .green : .red)
                                Text(valid ? "Code accepted!" : "Invalid code")
                                    .font(.caption)
                            }
                        }
                    }
                }

                if let error = errorMessage {
                    Section {
                        Text(error)
                            .foregroundStyle(.red)
                            .font(.subheadline)
                    }
                }
            }
            .navigationTitle("Create Group")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") {
                        Task { await createGroup() }
                    }
                    .disabled(!isFormValid || isLoading)
                }
            }
            .task {
                await checkFeeStatus()
            }
        }
    }

    private func checkFeeStatus() async {
        do {
            feeStatus = try await APIClient.shared.request(url: APIEndpoints.Groups.creationFeeStatus)
        } catch {
            // Non-critical, assume fee required
        }
    }

    private func validateWaiverCode() async {
        do {
            let result: WaiverCodeValidation = try await APIClient.shared.request(
                url: APIEndpoints.Groups.validateWaiverCode,
                method: "POST",
                body: ["code": waiverCode]
            )
            waiverValid = result.valid
        } catch {
            waiverValid = false
        }
    }

    private func createGroup() async {
        errorMessage = nil
        isLoading = true
        defer { isLoading = false }

        var body: [String: Any] = [
            "name": name,
            "contributionAmount": Double(contributionAmount) ?? 0,
            "frequency": frequency.rawValue,
            "payoutMethod": payoutMethod.rawValue,
            "maxMembers": Int(maxMembers) ?? 5,
        ]

        if !description.isEmpty { body["description"] = description }
        if showPayoutFrequency { body["payoutFrequency"] = payoutFrequency.rawValue }
        if !waiverCode.isEmpty && waiverValid == true { body["feeWaiverCode"] = waiverCode }

        do {
            let _: SavingsGroup = try await APIClient.shared.request(
                url: APIEndpoints.Groups.base,
                method: "POST",
                body: body
            )
            onCreated()
            dismiss()
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

#Preview {
    CreateGroupView {}
}
