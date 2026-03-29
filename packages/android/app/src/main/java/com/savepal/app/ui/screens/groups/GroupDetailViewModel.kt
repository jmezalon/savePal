package com.savepal.app.ui.screens.groups

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.savepal.app.data.model.*
import com.savepal.app.data.repository.AuthRepository
import com.savepal.app.data.repository.GroupRepository
import com.savepal.app.data.repository.PaymentRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class GroupDetailState(
    val group: SavingsGroup? = null,
    val cycles: List<Cycle> = emptyList(),
    val bids: List<Bid> = emptyList(),
    val readiness: GroupReadiness? = null,
    val currentUserId: String? = null,
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val error: String? = null,
    val actionMessage: String? = null,
    val deleted: Boolean = false,
    val bidAmount: String = "",
    val isReordering: Boolean = false,
    val reorderLoading: Boolean = false,
    val reorderMemberships: List<Membership> = emptyList(),
    val debtInfo: DebtInfo? = null,
    val paymentMethods: List<SavedPaymentMethod> = emptyList(),
    val selectedDebtMethodId: String? = null,
    val showPayDebtDialog: Boolean = false,
    val isPayingDebt: Boolean = false
) {
    val isOwner: Boolean get() = group?.createdById == currentUserId || group?.userRole == "OWNER"
    val currentCycle: Cycle? get() = cycles.firstOrNull { !it.isCompleted }
}

@HiltViewModel
class GroupDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val groupRepository: GroupRepository,
    private val authRepository: AuthRepository,
    private val paymentRepository: PaymentRepository
) : ViewModel() {

    private val groupId: String = savedStateHandle["groupId"] ?: ""
    private val _state = MutableStateFlow(GroupDetailState())
    val state: StateFlow<GroupDetailState> = _state.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            authRepository.getMe().onSuccess { user ->
                _state.update { it.copy(currentUserId = user.id) }
            }
            groupRepository.getGroup(groupId).onSuccess { group ->
                _state.update { it.copy(group = group) }
            }
            groupRepository.getGroupCycles(groupId).onSuccess { cycles ->
                _state.update { it.copy(cycles = cycles) }
                val current = cycles.firstOrNull { !it.isCompleted }
                if (current?.biddingStatus == BiddingStatus.OPEN || current?.biddingStatus == BiddingStatus.CLOSED) {
                    groupRepository.getCycleBids(current.id).onSuccess { bids ->
                        _state.update { it.copy(bids = bids) }
                    }
                }
            }
            if (_state.value.group?.status == GroupStatus.PENDING) {
                groupRepository.getGroupReadiness(groupId).onSuccess { readiness ->
                    _state.update { it.copy(readiness = readiness) }
                }
            }
            if (_state.value.group?.status == GroupStatus.ACTIVE) {
                paymentRepository.getDebtInfo(groupId).onSuccess { debt ->
                    if (debt.outstandingDebt > 0) {
                        _state.update { it.copy(debtInfo = debt) }
                    } else {
                        _state.update { it.copy(debtInfo = null) }
                    }
                }
            }
            _state.update { it.copy(isLoading = false) }
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _state.update { it.copy(isRefreshing = true) }
            load()
            _state.update { it.copy(isRefreshing = false) }
        }
    }

    fun startGroup() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            groupRepository.startGroup(groupId)
                .onSuccess { _state.update { it.copy(actionMessage = "Group started!") }; load() }
                .onFailure { e -> _state.update { it.copy(error = e.message, isLoading = false) } }
        }
    }

    fun deleteGroup() {
        viewModelScope.launch {
            groupRepository.deleteGroup(groupId)
                .onSuccess { _state.update { it.copy(deleted = true) } }
                .onFailure { e -> _state.update { it.copy(error = e.message) } }
        }
    }

    fun updateBidAmount(v: String) { _state.update { it.copy(bidAmount = v) } }

    fun placeBid() {
        val cycle = _state.value.currentCycle ?: return
        val amount = _state.value.bidAmount.toDoubleOrNull() ?: return
        viewModelScope.launch {
            groupRepository.placeBid(cycle.id, amount)
                .onSuccess {
                    _state.update { it.copy(bidAmount = "", actionMessage = "Bid placed!") }
                    load()
                }
                .onFailure { e -> _state.update { it.copy(error = e.message) } }
        }
    }

    fun resolveBidding() {
        val cycle = _state.value.currentCycle ?: return
        viewModelScope.launch {
            groupRepository.resolveBidding(cycle.id)
                .onSuccess { _state.update { it.copy(actionMessage = "Bidding resolved!") }; load() }
                .onFailure { e -> _state.update { it.copy(error = e.message) } }
        }
    }

    fun startReordering() {
        val memberships = _state.value.group?.memberships ?: return
        _state.update {
            it.copy(
                isReordering = true,
                reorderMemberships = memberships
                    .filter { m -> m.isActive }
                    .sortedBy { m -> m.payoutPosition ?: Int.MAX_VALUE }
            )
        }
    }

    fun cancelReordering() {
        _state.update { it.copy(isReordering = false, reorderMemberships = emptyList()) }
    }

    fun moveMember(index: Int, direction: Int) {
        val list = _state.value.reorderMemberships.toMutableList()
        val swapIndex = index + direction
        if (swapIndex < 0 || swapIndex >= list.size) return

        val tempPos = list[index].payoutPosition
        list[index] = list[index].copy(payoutPosition = list[swapIndex].payoutPosition)
        list[swapIndex] = list[swapIndex].copy(payoutPosition = tempPos)
        list.sortBy { it.payoutPosition ?: Int.MAX_VALUE }
        _state.update { it.copy(reorderMemberships = list) }
    }

    fun saveReorder() {
        viewModelScope.launch {
            _state.update { it.copy(reorderLoading = true) }
            val positions = _state.value.reorderMemberships.map { m ->
                PositionItem(userId = m.userId, payoutPosition = m.payoutPosition ?: 0)
            }
            groupRepository.reorderMembers(groupId, positions)
                .onSuccess {
                    _state.update { it.copy(isReordering = false, reorderMemberships = emptyList(), actionMessage = "Positions updated!") }
                    load()
                }
                .onFailure { e ->
                    _state.update { it.copy(error = e.message) }
                }
            _state.update { it.copy(reorderLoading = false) }
        }
    }

    fun showPayDebtDialog() {
        viewModelScope.launch {
            _state.update { it.copy(showPayDebtDialog = true) }
            paymentRepository.getPaymentMethods().onSuccess { methods ->
                val defaultId = methods.firstOrNull { it.isDefault }?.id ?: methods.firstOrNull()?.id
                _state.update { it.copy(paymentMethods = methods, selectedDebtMethodId = defaultId) }
            }
        }
    }

    fun dismissPayDebtDialog() {
        _state.update { it.copy(showPayDebtDialog = false) }
    }

    fun selectDebtPaymentMethod(id: String) {
        _state.update { it.copy(selectedDebtMethodId = id) }
    }

    fun payDebt() {
        val methodId = _state.value.selectedDebtMethodId ?: return
        viewModelScope.launch {
            _state.update { it.copy(isPayingDebt = true, error = null) }
            paymentRepository.payDebt(groupId, methodId)
                .onSuccess { result ->
                    _state.update {
                        it.copy(
                            isPayingDebt = false,
                            showPayDebtDialog = false,
                            actionMessage = "Debt paid! ${result.paymentsResolved} payment(s) resolved.",
                            debtInfo = null
                        )
                    }
                    load()
                }
                .onFailure { e ->
                    _state.update { it.copy(isPayingDebt = false, error = e.message) }
                }
        }
    }

    fun clearError() { _state.update { it.copy(error = null) } }
    fun clearActionMessage() { _state.update { it.copy(actionMessage = null) } }
}
