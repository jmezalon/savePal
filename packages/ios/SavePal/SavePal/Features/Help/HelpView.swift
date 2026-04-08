import SwiftUI

struct FAQItem: Identifiable {
    let id = UUID()
    let question: String
    let answer: String
}

struct HelpView: View {
    @State private var expandedItem: UUID?

    private let faqItems: [FAQItem] = [
        FAQItem(
            question: "What is a ROSCA?",
            answer: "A ROSCA (Rotating Savings and Credit Association) is a group savings method where members contribute a fixed amount regularly. Each cycle, one member receives the total collected amount. By the end, every member has both contributed and received."
        ),
        FAQItem(
            question: "How do I create a group?",
            answer: "Tap the '+' button on the Groups tab and select 'Create Group'. Set the contribution amount, frequency, payout method, and maximum number of members. Share the invite code with friends to have them join."
        ),
        FAQItem(
            question: "How do payments work?",
            answer: "When a cycle is due, each member makes their contribution. Payments are processed through Stripe using your saved payment method. A small processing fee (2.9% + $0.30) is added to cover transaction costs."
        ),
        FAQItem(
            question: "When do I receive my payout?",
            answer: "Payouts are distributed based on the group's payout method (sequential, random, or bidding). When it's your turn, the collected contributions are transferred to your connected bank account, minus a 3% platform fee."
        ),
        FAQItem(
            question: "What is a Trust Score?",
            answer: "Your Trust Score reflects your reliability as a group member. It increases when you verify your email (+20), verify your phone (+10), and make on-time payments (+5). It decreases when payments fail (-10)."
        ),
        FAQItem(
            question: "How do I set up payouts?",
            answer: "Go to Profile > Bank Account to connect your bank account via Stripe. You'll need your routing number, account number, and identity verification details. This is required before you can receive any payouts."
        ),
        FAQItem(
            question: "What happens if I miss a payment?",
            answer: "Failed payments are retried up to 3 times. After 3 failures, the unpaid amount is recorded as debt on your membership. This debt is automatically deducted from your future payout."
        ),
        FAQItem(
            question: "Is there a fee to create a group?",
            answer: "A one-time $10 creation fee applies. This fee is waived after 2 successful group completions or if you have a valid waiver code."
        ),
        FAQItem(
            question: "Why does the name on my card need to match my profile?",
            answer: "To prevent fraud, the cardholder name on any payment method you add must match the first and last name on your SavePal profile. You cannot add a card that belongs to someone else. If the names do not match, the card will be rejected."
        ),
        FAQItem(
            question: "Can I change my name on my profile?",
            answer: "No. Your first and last name are locked once your account is created and cannot be changed. This policy exists to protect the integrity of payment verification — since your card must match your profile name, allowing name changes could be used to bypass fraud protections. If you believe your name was entered incorrectly during registration, please contact support."
        ),
        FAQItem(
            question: "How many groups can I have at one time?",
            answer: "You can have a maximum of 5 active groups at a time. This includes groups with a status of Pending (waiting to start) or Active (currently running). Once a group is completed or cancelled, it no longer counts toward your limit and you can create or join new groups."
        ),
    ]

    var body: some View {
        List {
            Section {
                ForEach(faqItems) { item in
                    DisclosureGroup(
                        isExpanded: Binding(
                            get: { expandedItem == item.id },
                            set: { isExpanded in
                                expandedItem = isExpanded ? item.id : nil
                            }
                        )
                    ) {
                        Text(item.answer)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .padding(.vertical, 4)
                    } label: {
                        Text(item.question)
                            .font(.subheadline)
                            .fontWeight(.medium)
                    }
                }
            } header: {
                Text("Frequently Asked Questions")
            }

            Section {
                Link(destination: URL(string: "mailto:support@save-pals.com")!) {
                    Label("Contact Support", systemImage: "envelope")
                }
            } header: {
                Text("Need Help?")
            } footer: {
                Text("Send us an email and we'll get back to you as soon as possible.")
            }

            Section {
                Link(destination: URL(string: "https://save-pals.com/privacy")!) {
                    Label("Privacy Policy", systemImage: "hand.raised")
                }
                Link(destination: URL(string: "https://save-pals.com/terms")!) {
                    Label("Terms of Service", systemImage: "doc.text")
                }
            }
        }
        .navigationTitle("Help")
    }
}

#Preview {
    NavigationStack {
        HelpView()
    }
}
