package com.savepal.app.ui.screens.profile

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.savepal.app.data.model.*
import com.savepal.app.data.repository.PaymentRepository
import com.savepal.app.ui.components.*
import com.savepal.app.ui.theme.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class BankAccountState(
    val connectStatus: ConnectStatus? = null,
    val routingNumber: String = "",
    val accountNumber: String = "",
    val accountHolderName: String = "",
    val dateOfBirth: String = "",
    val ssnLast4: String = "",
    val addressLine1: String = "",
    val city: String = "",
    val state: String = "",
    val postalCode: String = "",
    val isLoading: Boolean = true,
    val isSaving: Boolean = false,
    val error: String? = null,
    val success: Boolean = false
)

@HiltViewModel
class BankAccountViewModel @Inject constructor(
    private val paymentRepository: PaymentRepository
) : androidx.lifecycle.ViewModel() {
    private val _state = MutableStateFlow(BankAccountState())
    val state: StateFlow<BankAccountState> = _state.asStateFlow()

    init { load() }

    private fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            paymentRepository.getConnectStatus()
                .onSuccess { status -> _state.update { it.copy(connectStatus = status, isLoading = false) } }
                .onFailure { _state.update { it.copy(isLoading = false) } }
        }
    }

    fun update(field: String, value: String) {
        _state.update {
            when (field) {
                "routing" -> it.copy(routingNumber = value)
                "account" -> it.copy(accountNumber = value)
                "holder" -> it.copy(accountHolderName = value)
                "dob" -> it.copy(dateOfBirth = value)
                "ssn" -> it.copy(ssnLast4 = value)
                "address" -> it.copy(addressLine1 = value)
                "city" -> it.copy(city = value)
                "state" -> it.copy(state = value)
                "zip" -> it.copy(postalCode = value)
                else -> it
            }
        }
    }

    fun clearError() { _state.update { it.copy(error = null) } }

    fun submit() {
        val s = _state.value
        viewModelScope.launch {
            _state.update { it.copy(isSaving = true, error = null) }
            paymentRepository.setupConnect(
                ConnectSetupRequest(
                    routingNumber = s.routingNumber,
                    accountNumber = s.accountNumber,
                    accountHolderName = s.accountHolderName,
                    dateOfBirth = s.dateOfBirth,
                    ssnLast4 = s.ssnLast4,
                    address = ConnectAddress(s.addressLine1, s.city, s.state, s.postalCode)
                )
            ).onSuccess {
                _state.update { it.copy(isSaving = false, success = true) }
                load()
            }.onFailure { e ->
                _state.update { it.copy(isSaving = false, error = e.message) }
            }
        }
    }

    fun removeBankAccount() {
        viewModelScope.launch {
            paymentRepository.deleteBankAccount()
            load()
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BankAccountScreen(
    onBack: () -> Unit,
    viewModel: BankAccountViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Bank Account") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        if (state.isLoading) {
            LoadingView(modifier = Modifier.padding(padding))
            return@Scaffold
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            state.error?.let {
                ErrorBanner(message = it, onDismiss = { viewModel.clearError() })
                Spacer(Modifier.height(16.dp))
            }

            val status = state.connectStatus
            if (status?.hasAccount == true) {
                // Show existing account
                SavePalCard {
                    Text("Bank Account Connected", style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(12.dp))
                    VerificationRow("Transfers", status.transfersStatus == "active")
                    Spacer(Modifier.height(8.dp))
                    status.bankName?.let {
                        Row {
                            Text("Bank: ", color = SavePalTextSecondary)
                            Text(it)
                        }
                        Spacer(Modifier.height(4.dp))
                    }
                    status.bankLast4?.let {
                        Row {
                            Text("Account ending in: ", color = SavePalTextSecondary)
                            Text("****$it")
                        }
                    }
                }

                if (status.requiresVerification == true) {
                    Spacer(Modifier.height(16.dp))
                    SavePalCard {
                        Row {
                            Icon(Icons.Default.Warning, contentDescription = null, tint = SavePalAmber, modifier = Modifier.size(20.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("Additional verification required", color = SavePalAmber)
                        }
                    }
                }

                Spacer(Modifier.height(24.dp))
                OutlinedButton(
                    onClick = { viewModel.removeBankAccount() },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = SavePalRed)
                ) {
                    Text("Replace Bank Account")
                }
            } else {
                // Setup form
                Text("Bank Details", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(8.dp))
                SavePalTextField(state.routingNumber, { viewModel.update("routing", it) }, "Routing Number (9 digits)", keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                Spacer(Modifier.height(12.dp))
                SavePalTextField(state.accountNumber, { viewModel.update("account", it) }, "Account Number", keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                Spacer(Modifier.height(12.dp))
                SavePalTextField(state.accountHolderName, { viewModel.update("holder", it) }, "Account Holder Name")

                Spacer(Modifier.height(24.dp))
                Text("Identity Verification", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(8.dp))
                SavePalTextField(state.dateOfBirth, { viewModel.update("dob", it) }, "Date of Birth (MM/DD/YYYY)")
                Spacer(Modifier.height(12.dp))
                SavePalTextField(state.ssnLast4, { viewModel.update("ssn", it) }, "SSN Last 4", keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))

                Spacer(Modifier.height(24.dp))
                Text("Address", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(8.dp))
                SavePalTextField(state.addressLine1, { viewModel.update("address", it) }, "Street Address")
                Spacer(Modifier.height(12.dp))
                SavePalTextField(state.city, { viewModel.update("city", it) }, "City")
                Spacer(Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    SavePalTextField(state.state, { viewModel.update("state", it) }, "State", modifier = Modifier.weight(1f))
                    SavePalTextField(state.postalCode, { viewModel.update("zip", it) }, "ZIP", modifier = Modifier.weight(1f), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                }

                Spacer(Modifier.height(32.dp))
                SavePalButton(
                    text = "Set Up Bank Account",
                    onClick = { viewModel.submit() },
                    isLoading = state.isSaving,
                    enabled = state.routingNumber.length == 9 && state.accountNumber.isNotBlank() && state.accountHolderName.isNotBlank()
                )
            }

            Spacer(Modifier.height(24.dp))
        }
    }
}
