package com.savepal.app.ui.screens.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.savepal.app.ui.components.*
import com.savepal.app.ui.screens.auth.AuthViewModel
import com.savepal.app.ui.theme.*

@Composable
fun ProfileScreen(
    modifier: Modifier = Modifier,
    onNavigateToEditProfile: () -> Unit,
    onNavigateToChangePassword: () -> Unit,
    onNavigateToNotificationPrefs: () -> Unit,
    onNavigateToPaymentMethods: () -> Unit,
    onNavigateToBankAccount: () -> Unit,
    onNavigateToHelp: () -> Unit,
    authViewModel: AuthViewModel = hiltViewModel()
) {
    val user by authViewModel.user.collectAsStateWithLifecycle()
    val hasActiveGroups by authViewModel.hasActiveGroups.collectAsStateWithLifecycle()
    var showDeleteDialog by remember { mutableStateOf(false) }
    var showLogoutDialog by remember { mutableStateOf(false) }

    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                authViewModel.refreshUser()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    LaunchedEffect(Unit) { authViewModel.checkActiveGroups() }

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text("Sign Out") },
            text = { Text("Are you sure you want to sign out?") },
            confirmButton = {
                TextButton(onClick = {
                    showLogoutDialog = false
                    authViewModel.logout()
                }) { Text("Sign Out", color = SavePalRed) }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) { Text("Cancel") }
            }
        )
    }

    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Delete Account") },
            text = { Text("This will permanently delete your account and all associated data. This cannot be undone.") },
            confirmButton = {
                TextButton(onClick = {
                    showDeleteDialog = false
                    authViewModel.deleteAccount()
                }) { Text("Delete", color = SavePalRed) }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) { Text("Cancel") }
            }
        )
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(SavePalBackground)
            .verticalScroll(rememberScrollState())
            .systemBarsPadding()
            .padding(16.dp)
    ) {
        // User Card
        SavePalCard {
            Row(verticalAlignment = Alignment.CenterVertically) {
                AvatarCircle(user?.initials ?: "?", size = 56)
                Spacer(Modifier.width(16.dp))
                Column {
                    Text(user?.fullName ?: "", style = MaterialTheme.typography.titleLarge)
                    Text(user?.email ?: "", style = MaterialTheme.typography.bodyMedium, color = SavePalTextSecondary)
                    user?.phoneNumber?.let {
                        Text(it, style = MaterialTheme.typography.bodySmall, color = SavePalTextSecondary)
                    }
                }
            }
        }

        Spacer(Modifier.height(16.dp))

        // Verification
        SavePalCard {
            Text("Verification", style = MaterialTheme.typography.titleSmall)
            Spacer(Modifier.height(12.dp))
            VerificationRow("Email", user?.emailVerified == true)
            Spacer(Modifier.height(8.dp))
            VerificationRow("Phone", user?.phoneVerified == true)
            Spacer(Modifier.height(8.dp))
            VerificationRow("Bank Account", user?.stripeConnectOnboarded == true)
        }

        Spacer(Modifier.height(16.dp))

        // Trust Score
        SavePalCard {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Trust Score", style = MaterialTheme.typography.titleSmall)
                Spacer(Modifier.weight(1f))
                val score = user?.trustScore ?: 0
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(
                            when {
                                score >= 80 -> SavePalGreenLight
                                score >= 50 -> SavePalAmberLight
                                else -> SavePalRedLight
                            }
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        "$score",
                        fontWeight = FontWeight.Bold,
                        color = when {
                            score >= 80 -> SavePalGreen
                            score >= 50 -> SavePalAmber
                            else -> SavePalRed
                        }
                    )
                }
            }
        }

        Spacer(Modifier.height(24.dp))

        // Account Section
        Text("Account", style = MaterialTheme.typography.titleSmall, color = SavePalTextSecondary)
        Spacer(Modifier.height(8.dp))
        ProfileMenuItem(Icons.Default.Edit, "Edit Profile", onClick = onNavigateToEditProfile)
        ProfileMenuItem(Icons.Default.Lock, "Change Password", onClick = onNavigateToChangePassword)
        ProfileMenuItem(Icons.Default.Notifications, "Notification Preferences", onClick = onNavigateToNotificationPrefs)

        Spacer(Modifier.height(24.dp))

        // Payment Section
        Text("Payment", style = MaterialTheme.typography.titleSmall, color = SavePalTextSecondary)
        Spacer(Modifier.height(8.dp))
        ProfileMenuItem(Icons.Default.CreditCard, "Payment Methods", onClick = onNavigateToPaymentMethods)
        ProfileMenuItem(Icons.Default.AccountBalance, "Bank Account (Payouts)", onClick = onNavigateToBankAccount)

        Spacer(Modifier.height(24.dp))

        // Help
        Text("Help", style = MaterialTheme.typography.titleSmall, color = SavePalTextSecondary)
        Spacer(Modifier.height(8.dp))
        ProfileMenuItem(Icons.Default.Help, "FAQ & Help", onClick = onNavigateToHelp)

        Spacer(Modifier.height(32.dp))

        // Sign Out
        OutlinedButton(
            onClick = { showLogoutDialog = true },
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = SavePalRed)
        ) {
            Icon(Icons.Default.Logout, contentDescription = null, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            Text("Sign Out")
        }

        Spacer(Modifier.height(12.dp))

        TextButton(
            onClick = { showDeleteDialog = true },
            modifier = Modifier.fillMaxWidth(),
            enabled = !hasActiveGroups
        ) {
            Text(
                if (hasActiveGroups) "Cannot delete — active group(s)" else "Delete Account",
                color = if (hasActiveGroups) SavePalTextTertiary else SavePalRed
            )
        }

        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun ProfileMenuItem(
    icon: ImageVector,
    title: String,
    onClick: () -> Unit
) {
    SavePalCard(modifier = Modifier.padding(vertical = 2.dp).clickable(onClick = onClick)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, contentDescription = null, tint = SavePalBlue, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(12.dp))
            Text(title, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = SavePalTextTertiary)
        }
    }
}
