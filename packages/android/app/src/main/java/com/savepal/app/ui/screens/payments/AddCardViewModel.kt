package com.savepal.app.ui.screens.payments

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.savepal.app.data.repository.PaymentRepository
import com.savepal.app.util.StripeHelper
import com.stripe.android.paymentsheet.PaymentSheetResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AddCardState(
    val clientSecret: String? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
    val success: Boolean = false,
    val readyToPresent: Boolean = false
)

@HiltViewModel
class AddCardViewModel @Inject constructor(
    private val paymentRepository: PaymentRepository,
    private val stripeHelper: StripeHelper
) : ViewModel() {

    private val _state = MutableStateFlow(AddCardState())
    val state: StateFlow<AddCardState> = _state.asStateFlow()

    init {
        viewModelScope.launch { stripeHelper.initialize() }
    }

    fun clearError() { _state.update { it.copy(error = null) } }

    fun createSetupIntent() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            paymentRepository.createSetupIntent()
                .onSuccess { intent ->
                    val secret = intent.secret
                    if (secret != null) {
                        _state.update { it.copy(clientSecret = secret, isLoading = false, readyToPresent = true) }
                    } else {
                        _state.update { it.copy(isLoading = false, error = "Failed to get client secret") }
                    }
                }
                .onFailure { e ->
                    _state.update { it.copy(isLoading = false, error = e.message) }
                }
        }
    }

    fun onSetupIntentPresented() {
        _state.update { it.copy(readyToPresent = false) }
    }

    fun onPaymentSheetResult(result: PaymentSheetResult) {
        stripeHelper.handlePaymentSheetResult(
            result = result,
            onSuccess = { _state.update { it.copy(success = true) } },
            onCanceled = { /* user cancelled, do nothing */ },
            onFailed = { msg -> _state.update { it.copy(error = msg) } }
        )
    }

    fun getPaymentSheetConfig() = stripeHelper.buildPaymentSheetConfig()
}
