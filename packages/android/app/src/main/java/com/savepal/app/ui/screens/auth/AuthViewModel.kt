package com.savepal.app.ui.screens.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.savepal.app.data.local.TokenManager
import com.savepal.app.data.model.User
import com.savepal.app.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val tokenManager: TokenManager
) : ViewModel() {

    sealed class AuthState {
        data object Loading : AuthState()
        data object Authenticated : AuthState()
        data object Unauthenticated : AuthState()
    }

    private val _authState = MutableStateFlow<AuthState>(AuthState.Loading)
    val authState: StateFlow<AuthState> = _authState.asStateFlow()

    private val _user = MutableStateFlow<User?>(null)
    val user: StateFlow<User?> = _user.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    val hasOnboarded: StateFlow<Boolean> = tokenManager.hasOnboarded
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)

    init {
        checkAuth()
    }

    private fun checkAuth() {
        viewModelScope.launch {
            val token = tokenManager.getToken()
            if (token != null) {
                authRepository.getMe()
                    .onSuccess {
                        _user.value = it
                        _authState.value = AuthState.Authenticated
                    }
                    .onFailure {
                        _authState.value = AuthState.Unauthenticated
                    }
            } else {
                _authState.value = AuthState.Unauthenticated
            }
        }
    }

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            authRepository.login(email, password)
                .onSuccess {
                    _user.value = it
                    _authState.value = AuthState.Authenticated
                }
                .onFailure { _error.value = it.message ?: "Login failed" }
            _isLoading.value = false
        }
    }

    fun register(firstName: String, lastName: String, email: String, password: String, phone: String?) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            authRepository.register(firstName, lastName, email, password, phone)
                .onSuccess {
                    _user.value = it
                    _authState.value = AuthState.Authenticated
                }
                .onFailure { _error.value = it.message ?: "Registration failed" }
            _isLoading.value = false
        }
    }

    fun googleAuth(token: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            authRepository.googleAuth(token)
                .onSuccess {
                    _user.value = it
                    _authState.value = AuthState.Authenticated
                }
                .onFailure { _error.value = it.message ?: "Google sign-in failed" }
            _isLoading.value = false
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
            _user.value = null
            _authState.value = AuthState.Unauthenticated
        }
    }

    fun refreshUser() {
        viewModelScope.launch {
            authRepository.getMe().onSuccess { _user.value = it }
        }
    }

    fun setOnboarded() {
        viewModelScope.launch { tokenManager.setOnboarded() }
    }

    fun clearError() { _error.value = null }
}
