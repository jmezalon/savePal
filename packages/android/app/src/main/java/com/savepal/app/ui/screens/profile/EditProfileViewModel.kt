package com.savepal.app.ui.screens.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.savepal.app.data.model.UpdateProfileRequest
import com.savepal.app.data.model.User
import com.savepal.app.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class EditProfileState(
    val firstName: String = "",
    val lastName: String = "",
    val phone: String = "",
    val verificationCode: String = "",
    val codeSent: Boolean = false,
    val verificationMessage: String? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
    val success: Boolean = false
)

@HiltViewModel
class EditProfileViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _state = MutableStateFlow(EditProfileState())
    val state: StateFlow<EditProfileState> = _state.asStateFlow()
    private var initialized = false

    fun initFrom(user: User) {
        if (initialized) return
        initialized = true
        _state.update {
            it.copy(
                firstName = user.firstName,
                lastName = user.lastName,
                phone = user.phoneNumber ?: ""
            )
        }
    }

    fun updateFirstName(v: String) { _state.update { it.copy(firstName = v) } }
    fun updateLastName(v: String) { _state.update { it.copy(lastName = v) } }
    fun updatePhone(v: String) { _state.update { it.copy(phone = v) } }
    fun updateVerificationCode(v: String) { _state.update { it.copy(verificationCode = v) } }
    fun clearError() { _state.update { it.copy(error = null) } }

    fun save() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            authRepository.updateProfile(
                UpdateProfileRequest(
                    firstName = _state.value.firstName.trim(),
                    lastName = _state.value.lastName.trim(),
                    phoneNumber = _state.value.phone.trim().ifBlank { null }
                )
            ).onSuccess { _state.update { it.copy(isLoading = false, success = true) } }
                .onFailure { e -> _state.update { it.copy(isLoading = false, error = e.message) } }
        }
    }

    fun sendVerificationCode() {
        viewModelScope.launch {
            authRepository.sendPhoneVerification()
                .onSuccess { _state.update { it.copy(codeSent = true, verificationMessage = "Code sent!") } }
                .onFailure { e -> _state.update { it.copy(error = e.message) } }
        }
    }

    fun verifyPhone() {
        viewModelScope.launch {
            authRepository.verifyPhone(_state.value.verificationCode)
                .onSuccess { _state.update { it.copy(verificationMessage = "Phone verified!") } }
                .onFailure { e -> _state.update { it.copy(error = e.message) } }
        }
    }
}
