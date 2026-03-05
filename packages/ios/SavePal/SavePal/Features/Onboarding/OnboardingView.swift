import SwiftUI

struct OnboardingPage {
    let icon: String
    let title: String
    let description: String
}

struct OnboardingView: View {
    @Binding var hasCompletedOnboarding: Bool
    @State private var currentPage = 0

    private let pages: [OnboardingPage] = [
        OnboardingPage(
            icon: "person.3.fill",
            title: "Save Together",
            description: "Join a trusted group of people who contribute a fixed amount on a regular schedule. Each member takes turns receiving the full pot."
        ),
        OnboardingPage(
            icon: "calendar.badge.clock",
            title: "How It Works",
            description: "Everyone contributes equally each cycle. One member receives the total collection each round. By the end, everyone has both saved and received."
        ),
        OnboardingPage(
            icon: "shield.checkmark.fill",
            title: "Safe & Transparent",
            description: "Track every payment and payout in real time. Trust scores, identity verification, and automated payments keep your group accountable."
        ),
    ]

    var body: some View {
        VStack(spacing: 0) {
            TabView(selection: $currentPage) {
                ForEach(0..<pages.count, id: \.self) { index in
                    onboardingPage(pages[index])
                        .tag(index)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .always))

            VStack(spacing: 12) {
                Button {
                    if currentPage < pages.count - 1 {
                        withAnimation {
                            currentPage += 1
                        }
                    } else {
                        hasCompletedOnboarding = true
                    }
                } label: {
                    Text(currentPage < pages.count - 1 ? "Next" : "Get Started")
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                }
                .buttonStyle(.borderedProminent)
                .tint(Color.savePalBlue)

                if currentPage < pages.count - 1 {
                    Button("Skip") {
                        hasCompletedOnboarding = true
                    }
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 40)
        }
    }

    private func onboardingPage(_ page: OnboardingPage) -> some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: page.icon)
                .font(.system(size: 72))
                .foregroundStyle(Color.savePalBlue)

            Text(page.title)
                .font(.title)
                .fontWeight(.bold)

            Text(page.description)
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

            Spacer()
            Spacer()
        }
    }
}

#Preview {
    OnboardingView(hasCompletedOnboarding: .constant(false))
}
