package com.savepal.app.ui.screens.payments

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.savepal.app.data.model.SavedPaymentMethod
import com.savepal.app.data.repository.PaymentRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PaymentMethodsState(
    val methods: List<SavedPaymentMethod> = emptyList(),
    val isLoading: Boolean = true
)

@HiltViewModel
class PaymentMethodsViewModel @Inject constructor(
    private val paymentRepository: PaymentRepository
) : ViewModel() {

    private val _state = MutableStateFlow(PaymentMethodsState())
    val state: StateFlow<PaymentMethodsState> = _state.asStateFlow()

    init { load() }

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
}
