package com.savepal.app.ui.screens.payments

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.savepal.app.data.model.*
import com.savepal.app.data.repository.PaymentRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class MakePaymentState(
    val breakdown: PaymentBreakdown? = null,
    val paymentMethods: List<SavedPaymentMethod> = emptyList(),
    val selectedMethodId: String? = null,
    val isLoading: Boolean = true,
    val isProcessing: Boolean = false,
    val error: String? = null,
    val success: Boolean = false
)

@HiltViewModel
class MakePaymentViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val paymentRepository: PaymentRepository
) : ViewModel() {

    private val paymentId: String = savedStateHandle["paymentId"] ?: ""
    private val _state = MutableStateFlow(MakePaymentState())
    val state: StateFlow<MakePaymentState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            paymentRepository.getPaymentBreakdown(paymentId).onSuccess { b ->
                _state.update { it.copy(breakdown = b) }
            }
            paymentRepository.getPaymentMethods().onSuccess { methods ->
                val defaultId = methods.firstOrNull { it.isDefault }?.id ?: methods.firstOrNull()?.id
                _state.update { it.copy(paymentMethods = methods, selectedMethodId = defaultId) }
            }
            _state.update { it.copy(isLoading = false) }
        }
    }

    fun selectMethod(id: String) { _state.update { it.copy(selectedMethodId = id) } }
    fun clearError() { _state.update { it.copy(error = null) } }

    fun processPayment() {
        val methodId = _state.value.selectedMethodId ?: return
        viewModelScope.launch {
            _state.update { it.copy(isProcessing = true, error = null) }
            paymentRepository.processPayment(paymentId, methodId)
                .onSuccess { _state.update { it.copy(isProcessing = false, success = true) } }
                .onFailure { e -> _state.update { it.copy(isProcessing = false, error = e.message) } }
        }
    }
}
