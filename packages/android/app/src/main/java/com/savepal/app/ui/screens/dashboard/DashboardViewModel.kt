package com.savepal.app.ui.screens.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.savepal.app.data.model.*
import com.savepal.app.data.repository.AuthRepository
import com.savepal.app.data.repository.GroupRepository
import com.savepal.app.data.repository.NotificationRepository
import com.savepal.app.data.repository.PaymentRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class DashboardState(
    val user: User? = null,
    val groups: List<SavingsGroup> = emptyList(),
    val pendingPayments: List<Payment> = emptyList(),
    val paymentStats: PaymentStats? = null,
    val unreadCount: Int = 0,
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val groupRepository: GroupRepository,
    private val paymentRepository: PaymentRepository,
    private val notificationRepository: NotificationRepository
) : ViewModel() {

    private val _state = MutableStateFlow(DashboardState())
    val state: StateFlow<DashboardState> = _state.asStateFlow()

    init { loadDashboard() }

    fun loadDashboard() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            loadAll()
            _state.update { it.copy(isLoading = false) }
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _state.update { it.copy(isRefreshing = true) }
            loadAll()
            _state.update { it.copy(isRefreshing = false) }
        }
    }

    private suspend fun loadAll() {
        authRepository.getMe().onSuccess { user ->
            _state.update { it.copy(user = user) }
        }
        groupRepository.getGroups().onSuccess { groups ->
            _state.update { it.copy(groups = groups) }
        }
        paymentRepository.getPendingPayments().onSuccess { payments ->
            _state.update { it.copy(pendingPayments = payments) }
        }
        paymentRepository.getPaymentStats().onSuccess { stats ->
            _state.update { it.copy(paymentStats = stats) }
        }
        notificationRepository.getUnreadCount().onSuccess { count ->
            _state.update { it.copy(unreadCount = count) }
        }
    }
}
