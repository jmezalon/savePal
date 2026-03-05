import SwiftUI

struct StatusBadge: View {
    let text: String
    let color: Color

    var body: some View {
        Text(text)
            .font(.caption2)
            .fontWeight(.semibold)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(color.opacity(0.15))
            .foregroundStyle(color)
            .clipShape(Capsule())
    }
}

// MARK: - Convenience initializers

extension StatusBadge {
    init(groupStatus: GroupStatus) {
        self.text = groupStatus.displayName
        switch groupStatus {
        case .PENDING: self.color = .orange
        case .ACTIVE: self.color = .green
        case .COMPLETED: self.color = .blue
        case .CANCELLED: self.color = .red
        }
    }

    init(paymentStatus: PaymentStatus) {
        self.text = paymentStatus.displayName
        switch paymentStatus {
        case .PENDING: self.color = .orange
        case .PROCESSING: self.color = .blue
        case .COMPLETED: self.color = .green
        case .FAILED: self.color = .red
        case .REFUNDED: self.color = .purple
        }
    }
}

#Preview {
    VStack(spacing: 8) {
        StatusBadge(groupStatus: .PENDING)
        StatusBadge(groupStatus: .ACTIVE)
        StatusBadge(paymentStatus: .COMPLETED)
        StatusBadge(paymentStatus: .FAILED)
    }
}
