package com.savepal.app.ui.screens.groups

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.savepal.app.data.model.*
import com.savepal.app.data.repository.GroupRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class GroupsListState(
    val groups: List<SavingsGroup> = emptyList(),
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false
)

@HiltViewModel
class GroupsViewModel @Inject constructor(
    private val groupRepository: GroupRepository
) : ViewModel() {

    private val _state = MutableStateFlow(GroupsListState())
    val state: StateFlow<GroupsListState> = _state.asStateFlow()

    init { loadGroups() }

    fun loadGroups() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            groupRepository.getGroups().onSuccess { groups ->
                _state.update { it.copy(groups = groups, isLoading = false) }
            }.onFailure {
                _state.update { it.copy(isLoading = false) }
            }
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _state.update { it.copy(isRefreshing = true) }
            groupRepository.getGroups().onSuccess { groups ->
                _state.update { it.copy(groups = groups) }
            }
            _state.update { it.copy(isRefreshing = false) }
        }
    }
}
