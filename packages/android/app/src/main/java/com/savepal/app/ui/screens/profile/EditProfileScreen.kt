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
import com.savepal.app.ui.components.*
import com.savepal.app.ui.screens.auth.AuthViewModel
import com.savepal.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditProfileScreen(
    onBack: () -> Unit,
    viewModel: EditProfileViewModel = hiltViewModel(),
    authViewModel: AuthViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val user by authViewModel.user.collectAsStateWithLifecycle()

    LaunchedEffect(user) {
        user?.let { viewModel.initFrom(it) }
    }

    LaunchedEffect(state.success) {
        if (state.success) {
            authViewModel.refreshUser()
            onBack()
        }
    }

    LaunchedEffect(state.phoneVerified) {
        if (state.phoneVerified) {
            authViewModel.refreshUser()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Edit Profile") },
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
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            state.error?.let {
                ErrorBanner(message = it, onDismiss = { viewModel.clearError() })
                Spacer(Modifier.height(16.dp))
            }

            SavePalTextField(
                value = state.firstName,
                onValueChange = { viewModel.updateFirstName(it) },
                label = "First Name",
                leadingIcon = Icons.Default.Person
            )
            Spacer(Modifier.height(16.dp))
            SavePalTextField(
                value = state.lastName,
                onValueChange = { viewModel.updateLastName(it) },
                label = "Last Name",
                leadingIcon = Icons.Default.Person
            )
            Spacer(Modifier.height(16.dp))
            SavePalTextField(
                value = state.phone,
                onValueChange = { viewModel.updatePhone(it) },
                label = "Phone Number",
                leadingIcon = Icons.Default.Phone,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone)
            )

            // Phone verification
            if (state.phone.isNotBlank() && user?.phoneVerified != true && !state.phoneVerified) {
                Spacer(Modifier.height(16.dp))
                SavePalCard {
                    Text("Phone Verification", style = MaterialTheme.typography.titleSmall)
                    Spacer(Modifier.height(8.dp))

                    if (!state.codeSent) {
                        Button(onClick = { viewModel.sendVerificationCode() }) {
                            Text("Send Verification Code")
                        }
                    } else {
                        SavePalTextField(
                            value = state.verificationCode,
                            onValueChange = { viewModel.updateVerificationCode(it) },
                            label = "6-digit code",
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                        )
                        Spacer(Modifier.height(8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(
                                onClick = { viewModel.verifyPhone() },
                                enabled = state.verificationCode.length == 6
                            ) { Text("Verify") }
                            TextButton(onClick = { viewModel.sendVerificationCode() }) {
                                Text("Resend")
                            }
                        }
                    }
                }
            }

            if (state.phoneVerified) {
                Spacer(Modifier.height(16.dp))
                SavePalCard {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Default.CheckCircle, contentDescription = null, tint = SavePalGreen)
                        Text("Phone verified!", color = SavePalGreen)
                    }
                }
            }

            Spacer(Modifier.height(32.dp))

            SavePalButton(
                text = "Save Changes",
                onClick = { viewModel.save() },
                isLoading = state.isLoading,
                enabled = state.firstName.isNotBlank() && state.lastName.isNotBlank()
            )
        }
    }
}
