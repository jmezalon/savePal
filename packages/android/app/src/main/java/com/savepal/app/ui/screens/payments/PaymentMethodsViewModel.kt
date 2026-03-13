package com.savepal.app.ui.screens.payments

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.savepal.app.data.model.SavedPaymentMethod
import com.savepal.app.data.repository.PaymentRepository
import com.savepal.app.util.StripeHelper
import com.stripe.android.paymentsheet.PaymentSheetResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PaymentMethodsState(
    val methods: List<SavedPaymentMethod> = emptyList(),
    val isLoading: Boolean = true,
    val addCardLoading: Boolean = false,
    val addCardError: String? = null,
    val clientSecret: String? = null,
    val readyToPresent: Boolean = false
)

@HiltViewModel
class PaymentMethodsViewModel @Inject constructor(
    private val paymentRepository: PaymentRepository,
    private val stripeHelper: StripeHelper
) : ViewModel() {

    private val _state = MutableStateFlow(PaymentMethodsState())
    val state: StateFlow<PaymentMethodsState> = _state.asStateFlow()

    init {
        load()
        viewModelScope.launch { stripeHelper.initialize() }
    }

    private fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            paymentRepository.getPaymentMethods().onSuccess { methods ->
                _state.update { it.copy(methods = methods) }
            }
            _state.update { it.copy(isLoading = false) }
        }
    }

    fun setDefault(id: String) {
        viewModelScope.launch {
            paymentRepository.setDefaultPaymentMethod(id)
            load()
        }
    }

    fun delete(id: String) {
        viewModelScope.launch {
            paymentRepository.deletePaymentMethod(id)
            load()
        }
    }

    fun addCard() {
        viewModelScope.launch {
            _state.update { it.copy(addCardLoading = true, addCardError = null) }
            paymentRepository.createSetupIntent()
                .onSuccess { intent ->
                    val secret = intent.secret
                    if (secret != null) {
                        _state.update { it.copy(clientSecret = secret, addCardLoading = false, readyToPresent = true) }
                    } else {
                        _state.update { it.copy(addCardLoading = false, addCardError = "Failed to get client secret") }
                    }
                }
                .onFailure { e ->
                    _state.update { it.copy(addCardLoading = false, addCardError = e.message) }
                }
        }
    }

    fun onSetupIntentPresented() {
        _state.update { it.copy(readyToPresent = false) }
    }

    fun onPaymentSheetResult(result: PaymentSheetResult) {
        stripeHelper.handlePaymentSheetResult(
            result = result,
            onSuccess = { load() },
            onCanceled = { /* user cancelled */ },
            onFailed = { msg -> _state.update { it.copy(addCardError = msg) } }
        )
    }

    fun getPaymentSheetConfig() = stripeHelper.buildPaymentSheetConfig()

    fun clearAddCardError() { _state.update { it.copy(addCardError = null) } }
}
