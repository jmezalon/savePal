package com.savepal.app.ui.screens.payments

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.savepal.app.data.model.*
import com.savepal.app.data.repository.PaymentRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PaymentHistoryState(
    val payments: List<Payment> = emptyList(),
    val payouts: List<Payout> = emptyList(),
    val paymentStats: PaymentStats? = null,
    val payoutStats: PayoutStats? = null,
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false
)

@HiltViewModel
class PaymentHistoryViewModel @Inject constructor(
    private val paymentRepository: PaymentRepository
) : ViewModel() {

    private val _state = MutableStateFlow(PaymentHistoryState())
    val state: StateFlow<PaymentHistoryState> = _state.asStateFlow()

    init { load() }

    private fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            paymentRepository.getMyPayments().onSuccess { p -> _state.update { it.copy(payments = p) } }
            paymentRepository.getMyPayouts().onSuccess { p -> _state.update { it.copy(payouts = p) } }
            paymentRepository.getPaymentStats().onSuccess { s -> _state.update { it.copy(paymentStats = s) } }
            paymentRepository.getPayoutStats().onSuccess { s -> _state.update { it.copy(payoutStats = s) } }
            _state.update { it.copy(isLoading = false) }
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _state.update { it.copy(isRefreshing = true) }
            paymentRepository.getMyPayments().onSuccess { p -> _state.update { it.copy(payments = p) } }
            paymentRepository.getMyPayouts().onSuccess { p -> _state.update { it.copy(payouts = p) } }
            paymentRepository.getPaymentStats().onSuccess { s -> _state.update { it.copy(paymentStats = s) } }
            paymentRepository.getPayoutStats().onSuccess { s -> _state.update { it.copy(payoutStats = s) } }
            _state.update { it.copy(isRefreshing = false) }
        }
    }

    fun retryPayout(id: String) {
        viewModelScope.launch {
            paymentRepository.retryPayout(id)
            refresh()
        }
    }
}
