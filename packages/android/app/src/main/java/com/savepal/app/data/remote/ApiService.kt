package com.savepal.app.data.remote

import com.savepal.app.data.model.*
import retrofit2.http.*

interface ApiService {

    // ── Auth ──

    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): ApiResponse<AuthResponse>

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): ApiResponse<AuthResponse>

    @POST("auth/google")
    suspend fun googleAuth(@Body request: GoogleAuthRequest): ApiResponse<AuthResponse>

    @POST("auth/apple")
    suspend fun appleAuth(@Body request: AppleAuthRequest): ApiResponse<AuthResponse>

    @POST("auth/forgot-password")
    suspend fun forgotPassword(@Body request: ForgotPasswordRequest): MessageResponse

    @POST("auth/reset-password")
    suspend fun resetPassword(@Body request: ResetPasswordRequest): MessageResponse

    @GET("auth/me")
    suspend fun getMe(): ApiResponse<User>

    @PATCH("auth/profile")
    suspend fun updateProfile(@Body request: UpdateProfileRequest): ApiResponse<User>

    @PATCH("auth/notifications")
    suspend fun updateNotificationPrefs(@Body request: NotificationPrefsRequest): ApiResponse<User>

    @POST("auth/change-password")
    suspend fun changePassword(@Body request: ChangePasswordRequest): MessageResponse

    @POST("auth/send-phone-verification")
    suspend fun sendPhoneVerification(): MessageResponse

    @POST("auth/verify-phone")
    suspend fun verifyPhone(@Body request: PhoneVerificationRequest): MessageResponse

    @DELETE("auth/delete-account")
    suspend fun deleteAccount(): MessageResponse

    @POST("auth/logout")
    suspend fun logout(): MessageResponse

    // ── Groups ──

    @GET("groups")
    suspend fun getGroups(): ApiResponse<List<SavingsGroup>>

    @GET("groups/{id}")
    suspend fun getGroup(@Path("id") id: String): ApiResponse<SavingsGroup>

    @POST("groups")
    suspend fun createGroup(@Body request: CreateGroupRequest): ApiResponse<SavingsGroup>

    @POST("groups/join")
    suspend fun joinGroup(@Body request: JoinGroupRequest): ApiResponse<Membership>

    @GET("groups/creation-fee-status")
    suspend fun getCreationFeeStatus(): ApiResponse<CreationFeeStatus>

    @POST("groups/validate-waiver-code")
    suspend fun validateWaiverCode(@Body body: Map<String, String>): ApiResponse<WaiverCodeValidation>

    @GET("groups/{id}/readiness")
    suspend fun getGroupReadiness(@Path("id") id: String): ApiResponse<GroupReadiness>

    @POST("groups/{id}/start")
    suspend fun startGroup(@Path("id") id: String): ApiResponse<SavingsGroup>

    @PUT("groups/{id}/reorder")
    suspend fun reorderMembers(@Path("id") id: String, @Body request: ReorderRequest): MessageResponse

    @DELETE("groups/{id}")
    suspend fun deleteGroup(@Path("id") id: String): MessageResponse

    @GET("groups/{id}/cycles")
    suspend fun getGroupCycles(@Path("id") id: String): ApiResponse<List<Cycle>>

    @GET("groups/{id}/payouts")
    suspend fun getGroupPayouts(@Path("id") id: String): ApiResponse<List<Payout>>

    // ── Cycles ──

    @GET("cycles/{id}")
    suspend fun getCycle(@Path("id") id: String): ApiResponse<Cycle>

    @GET("cycles/{id}/bids")
    suspend fun getCycleBids(@Path("id") id: String): ApiResponse<List<Bid>>

    @POST("cycles/{id}/bids")
    suspend fun placeBid(@Path("id") id: String, @Body request: PlaceBidRequest): ApiResponse<Bid>

    @POST("cycles/{id}/bids/resolve")
    suspend fun resolveBidding(@Path("id") id: String): ApiResponse<BidResolutionResult>

    // ── Payments ──

    @GET("payments/my-payments")
    suspend fun getMyPayments(): ApiResponse<List<Payment>>

    @GET("payments/my-payments/pending")
    suspend fun getPendingPayments(): ApiResponse<List<Payment>>

    @GET("payments/my-stats")
    suspend fun getPaymentStats(): ApiResponse<PaymentStats>

    @GET("payments/{id}/breakdown")
    suspend fun getPaymentBreakdown(@Path("id") id: String): ApiResponse<PaymentBreakdown>

    @POST("payments/{id}/process")
    suspend fun processPayment(
        @Path("id") id: String,
        @Body request: ProcessPaymentRequest
    ): ApiResponse<Payment>

    // ── Payouts ──

    @GET("payouts/my-payouts")
    suspend fun getMyPayouts(): ApiResponse<List<Payout>>

    @GET("payouts/my-stats")
    suspend fun getPayoutStats(): ApiResponse<PayoutStats>

    @POST("payouts/{id}/retry")
    suspend fun retryPayout(@Path("id") id: String): ApiResponse<Payout>

    // ── Notifications ──

    @GET("notifications")
    suspend fun getNotifications(): ApiResponse<List<AppNotification>>

    @GET("notifications/unread/count")
    suspend fun getUnreadCount(): ApiResponse<UnreadCount>

    @PATCH("notifications/{id}/read")
    suspend fun markNotificationRead(@Path("id") id: String): MessageResponse

    @PATCH("notifications/read-all")
    suspend fun markAllRead(): MessageResponse

    @DELETE("notifications/{id}")
    suspend fun deleteNotification(@Path("id") id: String): MessageResponse

    @POST("notifications/device-token")
    suspend fun registerDeviceToken(@Body request: DeviceTokenRequest): MessageResponse

    @HTTP(method = "DELETE", path = "notifications/device-token", hasBody = true)
    suspend fun unregisterDeviceToken(@Body request: DeviceTokenRequest): MessageResponse

    // ── Payment Methods ──

    @GET("payment-methods/config")
    suspend fun getStripeConfig(): ApiResponse<StripeConfig>

    @POST("payment-methods/setup-intent")
    suspend fun createSetupIntent(): ApiResponse<SetupIntentResponse>

    @POST("payment-methods")
    suspend fun savePaymentMethod(@Body request: SavePaymentMethodRequest): ApiResponse<SavedPaymentMethod>

    @GET("payment-methods")
    suspend fun getPaymentMethods(): ApiResponse<List<SavedPaymentMethod>>

    @DELETE("payment-methods/{id}")
    suspend fun deletePaymentMethod(@Path("id") id: String): MessageResponse

    @PUT("payment-methods/{id}/default")
    suspend fun setDefaultPaymentMethod(@Path("id") id: String): ApiResponse<SavedPaymentMethod>

    // ── Connect ──

    @POST("connect/setup")
    suspend fun setupConnect(@Body request: ConnectSetupRequest): ApiResponse<ConnectSetupResponse>

    @POST("connect/verify-identity")
    suspend fun verifyIdentity(@Body request: VerifyIdentityRequest): MessageResponse

    @GET("connect/status")
    suspend fun getConnectStatus(): ApiResponse<ConnectStatus>

    @DELETE("connect/bank-account")
    suspend fun deleteBankAccount(): MessageResponse
}
