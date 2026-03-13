package com.savepal.app.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// ── API Envelope ──

@Serializable
data class ApiResponse<T>(
    val success: Boolean,
    val message: String? = null,
    val data: T? = null,
    val error: String? = null
)

@Serializable
data class MessageResponse(
    val success: Boolean,
    val message: String? = null,
    val error: String? = null
)

// ── Auth ──

@Serializable
data class User(
    val id: String,
    val email: String,
    val firstName: String,
    val lastName: String,
    val googleId: String? = null,
    val appleId: String? = null,
    val phoneNumber: String? = null,
    val emailVerified: Boolean = false,
    val phoneVerified: Boolean = false,
    val trustScore: Int = 0,
    val role: UserRole = UserRole.USER,
    val emailNotifications: Boolean = true,
    val smsNotifications: Boolean = false,
    val pushNotifications: Boolean = true,
    val stripeCustomerId: String? = null,
    val stripeConnectAccountId: String? = null,
    val stripeConnectOnboarded: Boolean = false,
    val createdAt: String? = null,
    val updatedAt: String? = null
) {
    val fullName: String get() = "$firstName $lastName"
    val initials: String get() = "${firstName.firstOrNull() ?: ""}${lastName.firstOrNull() ?: ""}"
}

@Serializable
enum class UserRole {
    USER, SUPERADMIN
}

@Serializable
data class UserStats(
    val totalSaved: Double = 0.0,
    val activeGroups: Int = 0,
    val completedGroups: Int = 0
)

@Serializable
data class AuthResponse(
    val user: User,
    val token: String
)

@Serializable
data class LoginRequest(
    val email: String,
    val password: String
)

@Serializable
data class RegisterRequest(
    val firstName: String,
    val lastName: String,
    val email: String,
    val password: String,
    val phoneNumber: String? = null
)

@Serializable
data class GoogleAuthRequest(
    val token: String
)

@Serializable
data class AppleAuthRequest(
    val identityToken: String,
    val fullName: AppleFullName? = null
)

@Serializable
data class AppleFullName(
    val firstName: String? = null,
    val lastName: String? = null
)

@Serializable
data class ForgotPasswordRequest(val email: String)

@Serializable
data class ResetPasswordRequest(val token: String, val password: String)

@Serializable
data class ChangePasswordRequest(
    val currentPassword: String,
    val newPassword: String
)

@Serializable
data class UpdateProfileRequest(
    val firstName: String? = null,
    val lastName: String? = null,
    val phoneNumber: String? = null
)

@Serializable
data class NotificationPrefsRequest(
    val emailNotifications: Boolean? = null,
    val smsNotifications: Boolean? = null,
    val pushNotifications: Boolean? = null
)

@Serializable
data class PhoneVerificationRequest(val code: String)

// ── Groups ──

@Serializable
data class SavingsGroup(
    val id: String,
    val name: String,
    val description: String? = null,
    val contributionAmount: Double,
    val frequency: Frequency = Frequency.MONTHLY,
    val payoutFrequency: Frequency? = null,
    val payoutMethod: PayoutMethod = PayoutMethod.SEQUENTIAL,
    val status: GroupStatus = GroupStatus.PENDING,
    val maxMembers: Int,
    val currentMembers: Int = 0,
    val startDate: String? = null,
    val endDate: String? = null,
    val inviteCode: String? = null,
    val createdById: String? = null,
    val createdBy: GroupCreator? = null,
    val memberships: List<Membership>? = null,
    val userRole: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null
) {
    val isFull: Boolean get() = currentMembers >= maxMembers
    val formattedContribution: String get() = "$${String.format("%.2f", contributionAmount)}"
}

@Serializable
enum class Frequency { WEEKLY, BIWEEKLY, MONTHLY }

@Serializable
enum class PayoutMethod { SEQUENTIAL, RANDOM, BIDDING }

@Serializable
enum class GroupStatus { PENDING, ACTIVE, COMPLETED, CANCELLED }

@Serializable
data class GroupCreator(
    val id: String,
    val firstName: String,
    val lastName: String,
    val email: String? = null
)

@Serializable
data class CreateGroupRequest(
    val name: String,
    val description: String? = null,
    val contributionAmount: Double,
    val frequency: Frequency,
    val payoutFrequency: Frequency? = null,
    val payoutMethod: PayoutMethod,
    val maxMembers: Int,
    val waiverCode: String? = null,
    val paymentMethodId: String? = null
)

@Serializable
data class JoinGroupRequest(
    val inviteCode: String,
    val autoPaymentConsent: Boolean = false
)

@Serializable
data class GroupReadiness(
    val ready: Boolean,
    val membersWithoutPaymentMethod: List<MemberUser> = emptyList(),
    val membersWithoutVerification: List<MemberUser> = emptyList()
)

@Serializable
data class CreationFeeStatus(
    val feeRequired: Boolean,
    val reason: String? = null
)

@Serializable
data class WaiverCodeValidation(
    val valid: Boolean,
    val message: String? = null
)

@Serializable
data class ReorderRequest(
    val positions: List<PositionItem>
)

@Serializable
data class PositionItem(
    val membershipId: String,
    val position: Int
)

// ── Membership ──

@Serializable
data class Membership(
    val id: String,
    val groupId: String? = null,
    val userId: String,
    val role: MemberRole = MemberRole.MEMBER,
    val payoutPosition: Int? = null,
    val joinedAt: String? = null,
    val isActive: Boolean = true,
    val autoPaymentConsented: Boolean? = null,
    val outstandingDebt: Double? = null,
    val debtPaymentIds: List<String>? = null,
    val user: MemberUser? = null
)

@Serializable
enum class MemberRole { OWNER, ADMIN, MEMBER }

@Serializable
data class MemberUser(
    val id: String,
    val firstName: String,
    val lastName: String? = null,
    val email: String? = null,
    val trustScore: Int? = null,
    val emailVerified: Boolean? = null,
    val phoneVerified: Boolean? = null
) {
    val fullName: String get() = "$firstName ${lastName ?: ""}".trim()
    val initials: String get() = "${firstName.firstOrNull() ?: ""}${(lastName?.firstOrNull()) ?: ""}"
}

// ── Cycles ──

@Serializable
data class Cycle(
    val id: String,
    val groupId: String,
    val cycleNumber: Int,
    val recipientId: String? = null,
    val dueDate: String? = null,
    val completedDate: String? = null,
    val totalAmount: Double? = null,
    val isCompleted: Boolean = false,
    val biddingStatus: BiddingStatus? = null,
    val payments: List<Payment>? = null,
    val payout: Payout? = null,
    val group: SavingsGroup? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null
)

@Serializable
enum class BiddingStatus { OPEN, CLOSED }

@Serializable
data class Bid(
    val id: String,
    val cycleId: String,
    val userId: String,
    val amount: Double? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null,
    val user: BidUser? = null
)

@Serializable
data class BidUser(
    val id: String,
    val firstName: String,
    val lastName: String? = null
)

@Serializable
data class PlaceBidRequest(val amount: Double)

@Serializable
data class BidResolutionResult(
    val cycle: Cycle? = null,
    val winningBid: Bid? = null,
    val winnerUserId: String? = null,
    val bidFee: Double? = null
)

// ── Payments ──

@Serializable
data class Payment(
    val id: String,
    val cycleId: String? = null,
    val userId: String,
    val amount: Double,
    val status: PaymentStatus = PaymentStatus.PENDING,
    val contributionPeriod: Int? = null,
    val dueDate: String? = null,
    val stripePaymentIntentId: String? = null,
    val stripeChargeId: String? = null,
    val failureReason: String? = null,
    val retryCount: Int = 0,
    val paidAt: String? = null,
    val fallbackMethod: String? = null,
    val fallbackAt: String? = null,
    val user: MemberUser? = null,
    val cycle: PaymentCycle? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null
) {
    val formattedAmount: String get() = "$${String.format("%.2f", amount)}"
}

@Serializable
data class PaymentCycle(
    val id: String,
    val cycleNumber: Int? = null,
    val group: PaymentGroup? = null
)

@Serializable
data class PaymentGroup(
    val id: String,
    val name: String
)

@Serializable
enum class PaymentStatus { PENDING, PROCESSING, COMPLETED, FAILED, REFUNDED }

@Serializable
data class PaymentBreakdown(
    val contribution: Double,
    val processingFee: Double,
    val total: Double
)

@Serializable
data class PaymentStats(
    val total: Int = 0,
    val completed: Int = 0,
    val pending: Int = 0,
    val failed: Int = 0,
    val totalAmount: Double = 0.0,
    val paidAmount: Double = 0.0
)

@Serializable
data class ProcessPaymentRequest(
    val paymentMethodId: String
)

// ── Payouts ──

@Serializable
data class Payout(
    val id: String,
    val cycleId: String? = null,
    val recipientId: String? = null,
    val amount: Double = 0.0,
    val feeAmount: Double = 0.0,
    val netAmount: Double = 0.0,
    val status: PayoutStatus = PayoutStatus.PENDING,
    val stripeTransferId: String? = null,
    val transferredAt: String? = null,
    val failureReason: String? = null,
    val retryCount: Int = 0,
    val lastRetryAt: String? = null,
    val cycle: PayoutCycle? = null,
    val recipient: MemberUser? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null
) {
    val formattedNetAmount: String get() = "$${String.format("%.2f", netAmount)}"
}

@Serializable
data class PayoutCycle(
    val id: String,
    val cycleNumber: Int? = null,
    val group: PaymentGroup? = null
)

@Serializable
enum class PayoutStatus { PENDING, PROCESSING, COMPLETED, FAILED, REFUNDED }

@Serializable
data class PayoutStats(
    val total: Int = 0,
    val completed: Int = 0,
    val pending: Int = 0,
    val failed: Int = 0,
    val totalAmount: Double = 0.0,
    val totalNetAmount: Double = 0.0,
    val totalFees: Double = 0.0,
    val receivedAmount: Double = 0.0
)

// ── Payment Methods ──

@Serializable
data class SavedPaymentMethod(
    val id: String,
    val userId: String? = null,
    val stripePaymentMethodId: String? = null,
    val type: String? = null,
    val last4: String? = null,
    val brand: String? = null,
    val expiryMonth: Int? = null,
    val expiryYear: Int? = null,
    val isDefault: Boolean = false,
    val createdAt: String? = null,
    val updatedAt: String? = null
) {
    val displayName: String
        get() = "${brand?.replaceFirstChar { it.uppercase() } ?: "Card"} ****$last4"
}

@Serializable
data class StripeConfig(val publishableKey: String)

@Serializable
data class SetupIntentResponse(
    val id: String? = null,
    val clientSecret: String? = null,
    @SerialName("client_secret") val clientSecretAlt: String? = null
) {
    val secret: String? get() = clientSecret ?: clientSecretAlt
}

@Serializable
data class SavePaymentMethodRequest(
    val paymentMethodId: String,
    val setDefault: Boolean = false
)

// ── Connect / Bank Account ──

@Serializable
data class ConnectSetupRequest(
    val routingNumber: String,
    val accountNumber: String,
    val accountHolderName: String,
    val dateOfBirth: String,
    val ssnLast4: String,
    val address: ConnectAddress
)

@Serializable
data class ConnectAddress(
    val line1: String,
    val city: String,
    val state: String,
    val postalCode: String
)

@Serializable
data class ConnectSetupResponse(
    val accountId: String? = null,
    val bankLast4: String? = null,
    val transfersStatus: String? = null
)

@Serializable
data class ConnectStatus(
    val hasAccount: Boolean? = null,
    val isOnboarded: Boolean? = null,
    val accountId: String? = null,
    val chargesEnabled: Boolean? = null,
    val payoutsEnabled: Boolean? = null,
    val detailsSubmitted: Boolean? = null,
    val transfersStatus: String? = null,
    val bankLast4: String? = null,
    val bankName: String? = null,
    val bankAccounts: List<BankAccount>? = null,
    val requiresVerification: Boolean? = null,
    val currentlyDue: List<String>? = null,
    val requirements: ConnectRequirements? = null
)

@Serializable
data class BankAccount(
    val id: String? = null,
    val last4: String? = null,
    val bankName: String? = null,
    val routingNumber: String? = null
)

@Serializable
data class ConnectRequirements(
    val currentlyDue: List<String>? = null,
    val eventuallyDue: List<String>? = null,
    val pastDue: List<String>? = null
)

@Serializable
data class VerifyIdentityRequest(
    val dateOfBirth: String,
    val ssnLast4: String,
    val address: ConnectAddress
)

// ── Notifications ──

@Serializable
data class AppNotification(
    val id: String,
    val userId: String? = null,
    val groupId: String? = null,
    val type: NotificationType = NotificationType.REMINDER,
    val title: String,
    val message: String,
    val isRead: Boolean = false,
    val sentAt: String? = null,
    val createdAt: String? = null,
    val group: NotificationGroup? = null
)

@Serializable
data class NotificationGroup(
    val id: String,
    val name: String
)

@Serializable
enum class NotificationType {
    PAYMENT_DUE,
    PAYMENT_RECEIVED,
    PAYOUT_PENDING,
    PAYOUT_COMPLETED,
    PAYOUT_FAILED,
    GROUP_INVITE,
    GROUP_STARTED,
    GROUP_COMPLETED,
    PAYMENT_FAILED,
    CONNECT_ONBOARDING_REQUIRED,
    REMINDER,
    AUTO_PAYMENT_SCHEDULED,
    AUTO_PAYMENT_PROCESSED,
    DEBT_RECORDED,
    DEBT_DEDUCTED_FROM_PAYOUT,
    PAYMENT_DISPUTED
}

@Serializable
data class UnreadCount(val count: Int)

@Serializable
data class DeviceTokenRequest(
    val token: String,
    val platform: String = "android"
)
