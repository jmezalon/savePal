package com.savepal.app.ui.screens.groups

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
import com.savepal.app.data.model.Frequency
import com.savepal.app.data.model.PayoutMethod
import com.savepal.app.ui.components.*
import com.savepal.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateGroupScreen(
    onBack: () -> Unit,
    onGroupCreated: () -> Unit,
    viewModel: CreateGroupViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(state.success) {
        if (state.success) onGroupCreated()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Create Group") },
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

            // Group Details
            Text("Group Details", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(8.dp))

            SavePalTextField(
                value = state.name,
                onValueChange = { viewModel.updateName(it) },
                label = "Group Name",
                leadingIcon = Icons.Default.Group
            )
            Spacer(Modifier.height(12.dp))
            SavePalTextField(
                value = state.description,
                onValueChange = { viewModel.updateDescription(it) },
                label = "Description (optional)",
                singleLine = false
            )

            Spacer(Modifier.height(24.dp))

            // Contribution
            Text("Contribution", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(8.dp))

            SavePalTextField(
                value = state.amount,
                onValueChange = { viewModel.updateAmount(it) },
                label = "Amount ($)",
                leadingIcon = Icons.Default.AttachMoney,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
            )

            Spacer(Modifier.height(12.dp))

            Text("Frequency", style = MaterialTheme.typography.bodyMedium)
            Spacer(Modifier.height(8.dp))
            SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                Frequency.entries.forEachIndexed { index, freq ->
                    SegmentedButton(
                        selected = state.frequency == freq,
                        onClick = { viewModel.updateFrequency(freq) },
                        shape = SegmentedButtonDefaults.itemShape(index, Frequency.entries.size)
                    ) {
                        Text(freq.name.lowercase().replaceFirstChar { it.uppercase() })
                    }
                }
            }

            Spacer(Modifier.height(24.dp))

            // Payout Method
            Text("Payout Method", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(8.dp))
            SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                PayoutMethod.entries.forEachIndexed { index, method ->
                    SegmentedButton(
                        selected = state.payoutMethod == method,
                        onClick = { viewModel.updatePayoutMethod(method) },
                        shape = SegmentedButtonDefaults.itemShape(index, PayoutMethod.entries.size)
                    ) {
                        Text(method.name.lowercase().replaceFirstChar { it.uppercase() })
                    }
                }
            }

            Spacer(Modifier.height(24.dp))

            // Max Members
            Text("Max Members", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(8.dp))
            SavePalTextField(
                value = state.maxMembers,
                onValueChange = { viewModel.updateMaxMembers(it) },
                label = "Max Members (2-50)",
                leadingIcon = Icons.Default.People,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
            )

            // Waiver Code
            if (state.feeRequired) {
                Spacer(Modifier.height(24.dp))
                SavePalCard {
                    Text("Creation Fee", style = MaterialTheme.typography.titleSmall)
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "A $10 fee is required to create a group.",
                        style = MaterialTheme.typography.bodySmall,
                        color = SavePalTextSecondary
                    )
                    Spacer(Modifier.height(12.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        SavePalTextField(
                            value = state.waiverCode,
                            onValueChange = { viewModel.updateWaiverCode(it) },
                            label = "Waiver Code",
                            modifier = Modifier.weight(1f)
                        )
                        Button(
                            onClick = { viewModel.validateWaiverCode() },
                            modifier = Modifier.height(56.dp)
                        ) {
                            Text("Apply")
                        }
                    }
                }
            }

            Spacer(Modifier.height(32.dp))

            SavePalButton(
                text = "Create Group",
                onClick = { viewModel.createGroup() },
                isLoading = state.isLoading,
                enabled = state.name.isNotBlank() && state.amount.isNotBlank()
            )

            Spacer(Modifier.height(16.dp))
        }
    }
}
