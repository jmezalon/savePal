package com.savepal.app.util

import android.content.Context
import com.savepal.app.data.repository.PaymentRepository
import com.stripe.android.PaymentConfiguration
import com.stripe.android.paymentsheet.PaymentSheet
import com.stripe.android.paymentsheet.PaymentSheetResult
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class StripeHelper @Inject constructor(
    @ApplicationContext private val context: Context,
    private val paymentRepository: PaymentRepository
) {
    private val _isInitialized = MutableStateFlow(false)
    val isInitialized: StateFlow<Boolean> = _isInitialized.asStateFlow()

    private var publishableKey: String? = null

    suspend fun initialize() {
        if (_isInitialized.value) return
        paymentRepository.getStripeConfig()
            .onSuccess { config ->
                publishableKey = config.publishableKey
                PaymentConfiguration.init(context, config.publishableKey)
                _isInitialized.value = true
            }
    }

    fun buildPaymentSheetConfig(): PaymentSheet.Configuration {
        return PaymentSheet.Configuration.Builder("SavePal")
            .allowsDelayedPaymentMethods(false)
            .build()
    }

    fun handlePaymentSheetResult(
        result: PaymentSheetResult,
        onSuccess: () -> Unit,
        onCanceled: () -> Unit,
        onFailed: (String) -> Unit
    ) {
        when (result) {
            is PaymentSheetResult.Completed -> onSuccess()
            is PaymentSheetResult.Canceled -> onCanceled()
            is PaymentSheetResult.Failed -> onFailed(result.error.localizedMessage ?: "Payment failed")
        }
    }
}
