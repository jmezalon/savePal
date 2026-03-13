package com.savepal.app.ui.screens.payments

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.savepal.app.ui.components.*
import com.savepal.app.ui.theme.*
import com.savepal.app.util.toCurrency

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MakePaymentScreen(
    paymentId: String,
    onBack: () -> Unit,
    onPaymentSuccess: () -> Unit,
    viewModel: MakePaymentViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(state.success) {
        if (state.success) onPaymentSuccess()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Make Payment") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        if (state.isLoading && state.breakdown == null) {
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

            // Breakdown
            state.breakdown?.let { breakdown ->
                SavePalCard {
                    Text("Payment Breakdown", style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(16.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Contribution", color = SavePalTextSecondary)
                        Text(breakdown.contribution.toCurrency())
                    }
                    Spacer(Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Processing Fee", color = SavePalTextSecondary)
                        Text(breakdown.processingFee.toCurrency())
                    }
                    Spacer(Modifier.height(8.dp))
                    HorizontalDivider()
                    Spacer(Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Total", fontWeight = FontWeight.Bold)
                        Text(breakdown.total.toCurrency(), fontWeight = FontWeight.Bold, color = SavePalBlue)
                    }
                }
            }

            Spacer(Modifier.height(24.dp))

            // Payment Methods
            Text("Select Payment Method", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(8.dp))

            if (state.paymentMethods.isEmpty()) {
                SavePalCard {
                    Text("No payment methods found. Please add a card first.", color = SavePalTextSecondary)
                }
            } else {
                state.paymentMethods.forEach { method ->
                    SavePalCard(modifier = Modifier.padding(vertical = 4.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            RadioButton(
                                selected = state.selectedMethodId == method.id,
                                onClick = { viewModel.selectMethod(method.id) }
                            )
                            Spacer(Modifier.width(8.dp))
                            Icon(Icons.Default.CreditCard, contentDescription = null, modifier = Modifier.size(20.dp))
                            Spacer(Modifier.width(8.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(method.displayName, style = MaterialTheme.typography.bodyMedium)
                                if (method.expiryMonth != null && method.expiryYear != null) {
                                    Text(
                                        "Expires ${method.expiryMonth}/${method.expiryYear}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = SavePalTextSecondary
                                    )
                                }
                            }
                            if (method.isDefault) {
                                StatusBadge("Default", SavePalBlue)
                            }
                        }
                    }
                }
            }

            Spacer(Modifier.height(32.dp))

            SavePalButton(
                text = "Pay ${state.breakdown?.total?.toCurrency() ?: ""}",
                onClick = { viewModel.processPayment() },
                isLoading = state.isProcessing,
                enabled = state.selectedMethodId != null
            )
        }
    }
}
