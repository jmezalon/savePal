package com.savepal.app.ui.screens.payments

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.savepal.app.data.model.SavedPaymentMethod
import com.savepal.app.ui.components.*
import com.savepal.app.ui.theme.*
import com.stripe.android.paymentsheet.rememberPaymentSheet

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaymentMethodsScreen(
    onBack: () -> Unit,
    viewModel: PaymentMethodsViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    val paymentSheet = rememberPaymentSheet { result ->
        viewModel.onPaymentSheetResult(result)
    }

    // Present PaymentSheet when setup intent is ready
    LaunchedEffect(state.readyToPresent, state.clientSecret) {
        if (state.readyToPresent && state.clientSecret != null) {
            viewModel.onSetupIntentPresented()
            paymentSheet.presentWithSetupIntent(
                setupIntentClientSecret = state.clientSecret!!,
                configuration = viewModel.getPaymentSheetConfig()
            )
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Payment Methods") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    if (state.addCardLoading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(24.dp).then(Modifier.padding(end = 12.dp)),
                            strokeWidth = 2.dp
                        )
                    } else {
                        IconButton(onClick = { viewModel.addCard() }) {
                            Icon(Icons.Default.Add, contentDescription = "Add card")
                        }
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
                .padding(16.dp)
        ) {
            state.addCardError?.let {
                ErrorBanner(message = it, onDismiss = { viewModel.clearAddCardError() })
                Spacer(Modifier.height(8.dp))
            }

            if (state.methods.isEmpty()) {
                EmptyStateView(
                    icon = Icons.Default.CreditCard,
                    title = "No Payment Methods",
                    message = "Add a card to make payments.",
                    buttonText = "Add Card",
                    onButtonClick = { viewModel.addCard() }
                )
            } else {
                state.methods.forEach { method ->
                    PaymentMethodCard(
                        method = method,
                        isLastCard = state.methods.size == 1,
                        onSetDefault = { viewModel.setDefault(method.id) },
                        onDelete = { viewModel.delete(method.id) }
                    )
                    Spacer(Modifier.height(8.dp))
                }
            }
        }
    }
}

@Composable
private fun PaymentMethodCard(
    method: SavedPaymentMethod,
    isLastCard: Boolean,
    onSetDefault: () -> Unit,
    onDelete: () -> Unit
) {
    var showDeleteDialog by remember { mutableStateOf(false) }

    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Remove Card") },
            text = { Text("Remove ${method.displayName}?") },
            confirmButton = {
                TextButton(onClick = { showDeleteDialog = false; onDelete() }) {
                    Text("Remove", color = SavePalRed)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) { Text("Cancel") }
            }
        )
    }

    SavePalCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Default.CreditCard, contentDescription = null, tint = SavePalBlue)
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(method.displayName, style = MaterialTheme.typography.titleSmall)
                    if (method.isDefault) {
                        Spacer(Modifier.width(8.dp))
                        StatusBadge("Default", SavePalBlue)
                    }
                }
                if (method.expiryMonth != null && method.expiryYear != null) {
                    Text(
                        "Expires ${method.expiryMonth}/${method.expiryYear}",
                        style = MaterialTheme.typography.bodySmall,
                        color = SavePalTextSecondary
                    )
                }
            }
            if (!method.isDefault) {
                TextButton(onClick = onSetDefault) { Text("Set Default", color = SavePalBlue) }
            }
            IconButton(
                onClick = { showDeleteDialog = true },
                enabled = !isLastCard
            ) {
                Icon(
                    Icons.Default.Delete,
                    contentDescription = if (isLastCard) "Cannot delete last card" else "Delete",
                    tint = if (isLastCard) SavePalTextTertiary else SavePalRed
                )
            }
        }
    }
}
