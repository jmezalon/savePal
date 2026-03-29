package com.savepal.app.data.repository

import com.savepal.app.data.model.*
import com.savepal.app.data.remote.ApiService
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PaymentRepository @Inject constructor(
    private val api: ApiService
) {
    suspend fun getMyPayments(): Result<List<Payment>> = apiCall {
        api.getMyPayments().data ?: emptyList()
    }

    suspend fun getPendingPayments(): Result<List<Payment>> = apiCall {
        api.getPendingPayments().data ?: emptyList()
    }

    suspend fun getPaymentStats(): Result<PaymentStats> = apiCall {
        api.getPaymentStats().data ?: PaymentStats()
    }

    suspend fun getPaymentBreakdown(id: String): Result<PaymentBreakdown> = apiCall {
        api.getPaymentBreakdown(id).data ?: throw Exception("Failed to get breakdown")
    }

    suspend fun processPayment(id: String, paymentMethodId: String): Result<Payment> = apiCall {
        val response = api.processPayment(id, ProcessPaymentRequest(paymentMethodId))
        response.data ?: throw Exception(response.error ?: "Payment failed")
    }

    suspend fun getMyPayouts(): Result<List<Payout>> = apiCall {
        api.getMyPayouts().data ?: emptyList()
    }

    suspend fun getPayoutStats(): Result<PayoutStats> = apiCall {
        api.getPayoutStats().data ?: PayoutStats()
    }

    suspend fun retryPayout(id: String): Result<Payout> = apiCall {
        api.retryPayout(id).data ?: throw Exception("Failed to retry payout")
    }

    // Debt
    suspend fun getDebtInfo(groupId: String): Result<DebtInfo> = apiCall {
        api.getDebtInfo(groupId).data ?: throw Exception("Failed to get debt info")
    }

    suspend fun payDebt(groupId: String, paymentMethodId: String): Result<DebtPaymentResult> = apiCall {
        val response = api.payDebt(groupId, PayDebtRequest(paymentMethodId))
        response.data ?: throw Exception(response.error ?: "Debt payment failed")
    }

    // Payment Methods
    suspend fun getStripeConfig(): Result<StripeConfig> = apiCall {
        api.getStripeConfig().data ?: throw Exception("Failed to get Stripe config")
    }

    suspend fun createSetupIntent(): Result<SetupIntentResponse> = apiCall {
        api.createSetupIntent().data ?: throw Exception("Failed to create setup intent")
    }

    suspend fun confirmSetupIntent(setupIntentId: String): Result<String> = apiCall {
        api.confirmSetupIntent(ConfirmSetupRequest(setupIntentId)).message ?: "Confirmed"
    }

    suspend fun savePaymentMethod(paymentMethodId: String, setDefault: Boolean): Result<SavedPaymentMethod> = apiCall {
        api.savePaymentMethod(SavePaymentMethodRequest(paymentMethodId, setDefault)).data
            ?: throw Exception("Failed to save payment method")
    }

    suspend fun getPaymentMethods(): Result<List<SavedPaymentMethod>> = apiCall {
        api.getPaymentMethods().data ?: emptyList()
    }

    suspend fun deletePaymentMethod(id: String): Result<String> = apiCall {
        api.deletePaymentMethod(id).message ?: "Deleted"
    }

    suspend fun setDefaultPaymentMethod(id: String): Result<SavedPaymentMethod> = apiCall {
        api.setDefaultPaymentMethod(id).data ?: throw Exception("Failed to set default")
    }

    // Connect
    suspend fun setupConnect(request: ConnectSetupRequest): Result<ConnectSetupResponse> = apiCall {
        api.setupConnect(request).data ?: throw Exception("Failed to setup connect")
    }

    suspend fun verifyIdentity(request: VerifyIdentityRequest): Result<String> = apiCall {
        api.verifyIdentity(request).message ?: "Identity verified"
    }

    suspend fun getConnectStatus(): Result<ConnectStatus> = apiCall {
        api.getConnectStatus().data ?: ConnectStatus()
    }

    suspend fun deleteBankAccount(): Result<String> = apiCall {
        api.deleteBankAccount().message ?: "Bank account removed"
    }
}
