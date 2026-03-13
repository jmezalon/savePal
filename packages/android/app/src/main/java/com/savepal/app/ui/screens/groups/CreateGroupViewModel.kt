package com.savepal.app.ui.screens.groups

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.savepal.app.data.model.*
import com.savepal.app.data.repository.GroupRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class CreateGroupState(
    val name: String = "",
    val description: String = "",
    val amount: String = "",
    val frequency: Frequency = Frequency.MONTHLY,
    val payoutMethod: PayoutMethod = PayoutMethod.SEQUENTIAL,
    val maxMembers: String = "5",
    val waiverCode: String = "",
    val feeRequired: Boolean = false,
    val isLoading: Boolean = false,
    val error: String? = null,
    val success: Boolean = false
)

@HiltViewModel
class CreateGroupViewModel @Inject constructor(
    private val groupRepository: GroupRepository
) : ViewModel() {

    private val _state = MutableStateFlow(CreateGroupState())
    val state: StateFlow<CreateGroupState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            groupRepository.getCreationFeeStatus().onSuccess { status ->
                _state.update { it.copy(feeRequired = status.feeRequired) }
            }
        }
    }

    fun updateName(v: String) { _state.update { it.copy(name = v) } }
    fun updateDescription(v: String) { _state.update { it.copy(description = v) } }
    fun updateAmount(v: String) { _state.update { it.copy(amount = v) } }
    fun updateFrequency(v: Frequency) { _state.update { it.copy(frequency = v) } }
    fun updatePayoutMethod(v: PayoutMethod) { _state.update { it.copy(payoutMethod = v) } }
    fun updateMaxMembers(v: String) { _state.update { it.copy(maxMembers = v) } }
    fun updateWaiverCode(v: String) { _state.update { it.copy(waiverCode = v) } }
    fun clearError() { _state.update { it.copy(error = null) } }

    fun validateWaiverCode() {
        viewModelScope.launch {
            val code = _state.value.waiverCode.trim()
            if (code.isBlank()) return@launch
            groupRepository.validateWaiverCode(code)
                .onSuccess { result ->
                    if (result.valid) {
                        _state.update { it.copy(feeRequired = false) }
                    } else {
                        _state.update { it.copy(error = result.message ?: "Invalid code") }
                    }
                }
                .onFailure { _state.update { it.copy(error = it.error) } }
        }
    }

    fun createGroup() {
        val s = _state.value
        val amount = s.amount.toDoubleOrNull() ?: return
        val members = s.maxMembers.toIntOrNull()?.coerceIn(2, 50) ?: return

        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            groupRepository.createGroup(
                CreateGroupRequest(
                    name = s.name.trim(),
                    description = s.description.trim().ifBlank { null },
                    contributionAmount = amount,
                    frequency = s.frequency,
                    payoutMethod = s.payoutMethod,
                    maxMembers = members,
                    waiverCode = s.waiverCode.trim().ifBlank { null }
                )
            ).onSuccess {
                _state.update { it.copy(isLoading = false, success = true) }
            }.onFailure { e ->
                _state.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }
}
