package com.savepal.app.ui.screens.profile

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.savepal.app.data.repository.AuthRepository
import com.savepal.app.ui.components.*
import com.savepal.app.ui.theme.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ChangePasswordState(
    val currentPassword: String = "",
    val newPassword: String = "",
    val confirmPassword: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
    val success: Boolean = false
)

@HiltViewModel
class ChangePasswordViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : androidx.lifecycle.ViewModel() {
    private val _state = MutableStateFlow(ChangePasswordState())
    val state: StateFlow<ChangePasswordState> = _state.asStateFlow()

    fun updateCurrent(v: String) { _state.update { it.copy(currentPassword = v) } }
    fun updateNew(v: String) { _state.update { it.copy(newPassword = v) } }
    fun updateConfirm(v: String) { _state.update { it.copy(confirmPassword = v) } }
    fun clearError() { _state.update { it.copy(error = null) } }

    fun submit() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            authRepository.changePassword(_state.value.currentPassword, _state.value.newPassword)
                .onSuccess { _state.update { it.copy(isLoading = false, success = true) } }
                .onFailure { e -> _state.update { it.copy(isLoading = false, error = e.message) } }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChangePasswordScreen(
    onBack: () -> Unit,
    viewModel: ChangePasswordViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(state.success) { if (state.success) onBack() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Change Password") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            state.error?.let {
                ErrorBanner(message = it, onDismiss = { viewModel.clearError() })
                Spacer(Modifier.height(16.dp))
            }

            SavePalTextField(
                value = state.currentPassword,
                onValueChange = { viewModel.updateCurrent(it) },
                label = "Current Password",
                leadingIcon = Icons.Default.Lock,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password)
            )
            Spacer(Modifier.height(16.dp))
            SavePalTextField(
                value = state.newPassword,
                onValueChange = { viewModel.updateNew(it) },
                label = "New Password",
                leadingIcon = Icons.Default.Lock,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                isError = state.newPassword.isNotEmpty() && state.newPassword.length < 8,
                errorMessage = if (state.newPassword.isNotEmpty() && state.newPassword.length < 8) "At least 8 characters" else null
            )
            Spacer(Modifier.height(16.dp))
            SavePalTextField(
                value = state.confirmPassword,
                onValueChange = { viewModel.updateConfirm(it) },
                label = "Confirm New Password",
                leadingIcon = Icons.Default.Lock,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                isError = state.confirmPassword.isNotEmpty() && state.confirmPassword != state.newPassword,
                errorMessage = if (state.confirmPassword.isNotEmpty() && state.confirmPassword != state.newPassword) "Passwords don't match" else null
            )
            Spacer(Modifier.height(32.dp))
            SavePalButton(
                text = "Change Password",
                onClick = { viewModel.submit() },
                isLoading = state.isLoading,
                enabled = state.currentPassword.isNotBlank() && state.newPassword.length >= 8 && state.newPassword == state.confirmPassword
            )
        }
    }
}
