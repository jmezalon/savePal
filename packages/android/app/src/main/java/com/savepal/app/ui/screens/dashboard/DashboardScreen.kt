package com.savepal.app.ui.screens.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.savepal.app.ui.components.*
import com.savepal.app.ui.theme.*
import com.savepal.app.util.toCurrency

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    modifier: Modifier = Modifier,
    onNavigateToNotifications: () -> Unit,
    onNavigateToGroup: (String) -> Unit,
    onNavigateToPayment: (String) -> Unit,
    onNavigateToGroups: () -> Unit,
    onNavigateToCreateGroup: () -> Unit,
    onNavigateToJoinGroup: () -> Unit,
    viewModel: DashboardViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    if (state.isLoading && state.user == null) {
        LoadingView(modifier = modifier)
        return
    }

    val pullToRefreshState = rememberPullToRefreshState()

    Box(modifier = modifier.fillMaxSize()) {
        PullToRefreshBox(
            isRefreshing = state.isRefreshing,
            onRefresh = { viewModel.refresh() },
            state = pullToRefreshState
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(SavePalBackground)
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp)
                    .systemBarsPadding()
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            "Welcome back,",
                            style = MaterialTheme.typography.bodyMedium,
                            color = SavePalTextSecondary
                        )
                        Text(
                            state.user?.firstName ?: "",
                            style = MaterialTheme.typography.headlineMedium
                        )
                    }
                    BadgedBox(
                        badge = {
                            if (state.unreadCount > 0) {
                                Badge { Text("${state.unreadCount}") }
                            }
                        }
                    ) {
                        IconButton(onClick = onNavigateToNotifications) {
                            Icon(Icons.Default.Notifications, contentDescription = "Notifications")
                        }
                    }
                }

                Spacer(Modifier.height(20.dp))

                // Trust Score + Verification
                SavePalCard {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .clip(CircleShape)
                                .background(
                                    when {
                                        (state.user?.trustScore ?: 0) >= 80 -> SavePalGreenLight
                                        (state.user?.trustScore ?: 0) >= 50 -> SavePalAmberLight
                                        else -> SavePalRedLight
                                    }
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                "${state.user?.trustScore ?: 0}",
                                fontWeight = FontWeight.Bold,
                                color = when {
                                    (state.user?.trustScore ?: 0) >= 80 -> SavePalGreen
                                    (state.user?.trustScore ?: 0) >= 50 -> SavePalAmber
                                    else -> SavePalRed
                                }
                            )
                        }
                        Spacer(Modifier.width(12.dp))
                        Column {
                            Text("Trust Score", style = MaterialTheme.typography.titleSmall)
                            val allVerified = state.user?.emailVerified == true &&
                                state.user?.phoneVerified == true &&
                                state.user?.stripeConnectOnboarded == true
                            if (!allVerified) {
                                Text(
                                    "Complete verifications to improve",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = SavePalTextSecondary
                                )
                            }
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                    VerificationRow("Email", state.user?.emailVerified == true)
                    Spacer(Modifier.height(8.dp))
                    VerificationRow("Phone", state.user?.phoneVerified == true)
                    Spacer(Modifier.height(8.dp))
                    VerificationRow("Bank Account", state.user?.stripeConnectOnboarded == true)
                }

                Spacer(Modifier.height(16.dp))

                // Stats
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    SavePalCard(modifier = Modifier.weight(1f)) {
                        Icon(Icons.Default.Savings, contentDescription = null, tint = SavePalGreen, modifier = Modifier.size(24.dp))
                        Spacer(Modifier.height(8.dp))
                        Text(
                            (state.paymentStats?.paidAmount ?: 0.0).toCurrency(),
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                        Text("Total Saved", style = MaterialTheme.typography.bodySmall, color = SavePalTextSecondary)
                    }
                    SavePalCard(modifier = Modifier.weight(1f)) {
                        Icon(Icons.Default.Groups, contentDescription = null, tint = SavePalBlue, modifier = Modifier.size(24.dp))
                        Spacer(Modifier.height(8.dp))
                        Text(
                            "${state.groups.count { it.status == com.savepal.app.data.model.GroupStatus.ACTIVE }}",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                        Text("Active Groups", style = MaterialTheme.typography.bodySmall, color = SavePalTextSecondary)
                    }
                }

                // Pending Payments
                if (state.pendingPayments.isNotEmpty()) {
                    Spacer(Modifier.height(20.dp))
                    Text("Pending Payments", style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(8.dp))

                    state.pendingPayments.take(5).forEach { payment ->
                        SavePalCard(modifier = Modifier.padding(vertical = 4.dp)) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { onNavigateToPayment(payment.id) },
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(
                                        payment.cycle?.group?.name ?: "Payment",
                                        style = MaterialTheme.typography.titleSmall
                                    )
                                    Text(
                                        "Cycle ${payment.cycle?.cycleNumber ?: ""}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = SavePalTextSecondary
                                    )
                                }
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        payment.formattedAmount,
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.SemiBold,
                                        color = SavePalAmber
                                    )
                                    Spacer(Modifier.width(8.dp))
                                    Icon(
                                        Icons.Default.ChevronRight,
                                        contentDescription = null,
                                        tint = SavePalTextTertiary
                                    )
                                }
                            }
                        }
                    }
                }

                // Groups Preview
                Spacer(Modifier.height(20.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Your Groups", style = MaterialTheme.typography.titleMedium)
                    if (state.groups.isNotEmpty()) {
                        TextButton(onClick = onNavigateToGroups) {
                            Text("See All")
                        }
                    }
                }
                Spacer(Modifier.height(8.dp))

                if (state.groups.isEmpty()) {
                    SavePalCard {
                        Column(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                Icons.Default.GroupAdd,
                                contentDescription = null,
                                modifier = Modifier.size(40.dp),
                                tint = SavePalTextTertiary
                            )
                            Spacer(Modifier.height(8.dp))
                            Text("No groups yet", style = MaterialTheme.typography.titleSmall)
                            Spacer(Modifier.height(4.dp))
                            Text(
                                "Create or join a savings group to get started",
                                style = MaterialTheme.typography.bodySmall,
                                color = SavePalTextSecondary
                            )
                            Spacer(Modifier.height(16.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Button(onClick = onNavigateToCreateGroup) { Text("Create") }
                                OutlinedButton(onClick = onNavigateToJoinGroup) { Text("Join") }
                            }
                        }
                    }
                } else {
                    state.groups.take(3).forEach { group ->
                        SavePalCard(
                            modifier = Modifier
                                .padding(vertical = 4.dp)
                                .clickable { onNavigateToGroup(group.id) }
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(group.name, style = MaterialTheme.typography.titleSmall)
                                        Spacer(Modifier.width(8.dp))
                                        GroupStatusBadge(group.status)
                                    }
                                    Spacer(Modifier.height(4.dp))
                                    Text(
                                        "${group.formattedContribution} / ${group.frequency.name.lowercase().replaceFirstChar { it.uppercase() }}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = SavePalTextSecondary
                                    )
                                }
                                Icon(Icons.Default.ChevronRight, contentDescription = null, tint = SavePalTextTertiary)
                            }
                        }
                    }
                }

                Spacer(Modifier.height(24.dp))
            }
        }
    }
}
