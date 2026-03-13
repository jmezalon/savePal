package com.savepal.app.ui.screens.payments

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.savepal.app.data.repository.PaymentRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AddCardState(
    val clientSecret: String? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
    val success: Boolean = false
)

@HiltViewModel
class AddCardViewModel @Inject constructor(
    private val paymentRepository: PaymentRepository
) : ViewModel() {

    private val _state = MutableStateFlow(AddCardState())
    val state: StateFlow<AddCardState> = _state.asStateFlow()

    fun clearError() { _state.update { it.copy(error = null) } }

    fun initiateSetup() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            paymentRepository.createSetupIntent()
                .onSuccess { intent ->
                    _state.update { it.copy(clientSecret = intent.secret, isLoading = false) }
                    // In production: launch Stripe PaymentSheet with clientSecret
                    // PaymentSheet would handle card input and confirm SetupIntent
                    // On completion, save the payment method via API
                }
                .onFailure { e ->
                    _state.update { it.copy(isLoading = false, error = e.message) }
                }
        }
    }

    fun onCardSaved() {
        _state.update { it.copy(success = true) }
    }
}
