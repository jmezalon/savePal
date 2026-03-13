package com.savepal.app.ui.screens.groups

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.savepal.app.ui.components.*
import com.savepal.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JoinGroupScreen(
    onBack: () -> Unit,
    onJoined: () -> Unit,
    viewModel: JoinGroupViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(state.success) {
        if (state.success) onJoined()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Join Group") },
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
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(Modifier.height(32.dp))

            Icon(
                Icons.Default.GroupAdd,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = SavePalBlue
            )

            Spacer(Modifier.height(24.dp))

            Text(
                "Enter Invite Code",
                style = MaterialTheme.typography.headlineSmall,
                textAlign = TextAlign.Center
            )
            Spacer(Modifier.height(8.dp))
            Text(
                "Ask the group owner for their invite code to join their savings group.",
                style = MaterialTheme.typography.bodyMedium,
                color = SavePalTextSecondary,
                textAlign = TextAlign.Center
            )

            Spacer(Modifier.height(32.dp))

            state.error?.let {
                ErrorBanner(message = it, onDismiss = { viewModel.clearError() })
                Spacer(Modifier.height(16.dp))
            }

            SavePalTextField(
                value = state.inviteCode,
                onValueChange = { viewModel.updateInviteCode(it) },
                label = "Invite Code",
                leadingIcon = Icons.Default.Key
            )

            Spacer(Modifier.height(16.dp))

            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Checkbox(
                    checked = state.autoPayment,
                    onCheckedChange = { viewModel.updateAutoPayment(it) }
                )
                Spacer(Modifier.width(4.dp))
                Text(
                    "Enable auto-payment for this group",
                    style = MaterialTheme.typography.bodyMedium
                )
            }

            if (!state.autoPayment) {
                SavePalCard {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Warning, contentDescription = null, tint = SavePalAmber, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(8.dp))
                        Text(
                            "Without auto-payment, you'll need to manually pay each contribution period.",
                            style = MaterialTheme.typography.bodySmall,
                            color = SavePalAmber
                        )
                    }
                }
            }

            Spacer(Modifier.height(32.dp))

            SavePalButton(
                text = "Join Group",
                onClick = { viewModel.joinGroup() },
                isLoading = state.isLoading,
                enabled = state.inviteCode.isNotBlank()
            )
        }
    }
}
