package com.savepal.app.ui.screens.groups

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.savepal.app.data.repository.GroupRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class JoinGroupState(
    val inviteCode: String = "",
    val autoPayment: Boolean = true,
    val isLoading: Boolean = false,
    val error: String? = null,
    val success: Boolean = false
)

@HiltViewModel
class JoinGroupViewModel @Inject constructor(
    private val groupRepository: GroupRepository
) : ViewModel() {

    private val _state = MutableStateFlow(JoinGroupState())
    val state: StateFlow<JoinGroupState> = _state.asStateFlow()

    fun updateInviteCode(v: String) { _state.update { it.copy(inviteCode = v) } }
    fun updateAutoPayment(v: Boolean) { _state.update { it.copy(autoPayment = v) } }
    fun clearError() { _state.update { it.copy(error = null) } }

    fun joinGroup() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            groupRepository.joinGroup(_state.value.inviteCode.trim(), _state.value.autoPayment)
                .onSuccess { _state.update { it.copy(isLoading = false, success = true) } }
                .onFailure { e -> _state.update { it.copy(isLoading = false, error = e.message) } }
        }
    }
}
