package com.savepal.app.ui.screens.payments

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.savepal.app.ui.components.*
import com.savepal.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddCardScreen(
    onBack: () -> Unit,
    onCardAdded: () -> Unit,
    viewModel: AddCardViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(state.success) {
        if (state.success) onCardAdded()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Add Card") },
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
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            state.error?.let {
                ErrorBanner(message = it, onDismiss = { viewModel.clearError() })
                Spacer(Modifier.height(16.dp))
            }

            Icon(
                Icons.Default.CreditCard,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = SavePalBlue
            )
            Spacer(Modifier.height(24.dp))
            Text(
                "Add Payment Card",
                style = MaterialTheme.typography.headlineSmall
            )
            Spacer(Modifier.height(8.dp))
            Text(
                "Your card will be securely stored with Stripe for future payments.",
                style = MaterialTheme.typography.bodyMedium,
                color = SavePalTextSecondary,
                textAlign = TextAlign.Center
            )
            Spacer(Modifier.height(32.dp))

            // In a real implementation, this would use Stripe's PaymentSheet
            // For now, we show a button that initiates the Stripe flow
            SavePalButton(
                text = if (state.isLoading) "Setting up..." else "Add Card with Stripe",
                onClick = { viewModel.initiateSetup() },
                isLoading = state.isLoading
            )

            Spacer(Modifier.height(16.dp))
            Text(
                "Powered by Stripe",
                style = MaterialTheme.typography.bodySmall,
                color = SavePalTextTertiary
            )
        }
    }
}
