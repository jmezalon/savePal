package com.savepal.app.ui.screens.groups

import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.savepal.app.data.model.*
import com.savepal.app.ui.components.*
import com.savepal.app.ui.theme.*
import com.savepal.app.util.toCurrency
import com.savepal.app.util.toFormattedDate

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GroupDetailScreen(
    groupId: String,
    onBack: () -> Unit,
    onNavigateToPayment: (String) -> Unit,
    viewModel: GroupDetailViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    var showDeleteDialog by remember { mutableStateOf(false) }

    LaunchedEffect(state.deleted) { if (state.deleted) onBack() }

    state.actionMessage?.let { msg ->
        LaunchedEffect(msg) {
            viewModel.clearActionMessage()
        }
    }

    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Delete Group") },
            text = { Text("Are you sure you want to delete this group? This cannot be undone.") },
            confirmButton = {
                TextButton(onClick = { showDeleteDialog = false; viewModel.deleteGroup() }) {
                    Text("Delete", color = SavePalRed)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) { Text("Cancel") }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(state.group?.name ?: "Group") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        if (state.isLoading && state.group == null) {
            LoadingView(modifier = Modifier.padding(padding))
            return@Scaffold
        }

        val group = state.group ?: return@Scaffold

        PullToRefreshBox(
            isRefreshing = state.isRefreshing,
            onRefresh = { viewModel.refresh() },
            modifier = Modifier.padding(padding)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp)
            ) {
                state.error?.let {
                    ErrorBanner(message = it, onDismiss = { viewModel.clearError() })
                    Spacer(Modifier.height(12.dp))
                }

                // Status + description
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(group.name, style = MaterialTheme.typography.headlineSmall)
                    Spacer(Modifier.width(8.dp))
                    GroupStatusBadge(group.status)
                }
                if (!group.description.isNullOrBlank()) {
                    Spacer(Modifier.height(4.dp))
                    Text(group.description, style = MaterialTheme.typography.bodyMedium, color = SavePalTextSecondary)
                }

                Spacer(Modifier.height(16.dp))

                // Stats row
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    SavePalCard(modifier = Modifier.weight(1f)) {
                        Text(group.formattedContribution, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text(group.frequency.name.lowercase().replaceFirstChar { it.uppercase() }, style = MaterialTheme.typography.bodySmall, color = SavePalTextSecondary)
                    }
                    SavePalCard(modifier = Modifier.weight(1f)) {
                        Text("${group.currentMembers}/${group.maxMembers}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text("Members", style = MaterialTheme.typography.bodySmall, color = SavePalTextSecondary)
                    }
                    SavePalCard(modifier = Modifier.weight(1f)) {
                        Text(group.payoutMethod.name.lowercase().replaceFirstChar { it.uppercase() }, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text("Payout", style = MaterialTheme.typography.bodySmall, color = SavePalTextSecondary)
                    }
                }

                // Invite Code (owner + pending)
                if (state.isOwner && group.status == GroupStatus.PENDING && group.inviteCode != null) {
                    Spacer(Modifier.height(16.dp))
                    SavePalCard {
                        Text("Invite Code", style = MaterialTheme.typography.titleSmall)
                        Spacer(Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                group.inviteCode!!,
                                style = MaterialTheme.typography.headlineSmall,
                                fontWeight = FontWeight.Bold,
                                color = SavePalBlue
                            )
                            IconButton(onClick = {
                                val intent = Intent(Intent.ACTION_SEND).apply {
                                    type = "text/plain"
                                    putExtra(Intent.EXTRA_TEXT, "Join my SavePal group! Use invite code: ${group.inviteCode}")
                                }
                                context.startActivity(Intent.createChooser(intent, "Share Invite Code"))
                            }) {
                                Icon(Icons.Default.Share, contentDescription = "Share")
                            }
                        }
                    }
                }

                // Start Group button
                if (state.isOwner && group.status == GroupStatus.PENDING && group.currentMembers >= 2) {
                    Spacer(Modifier.height(12.dp))
                    SavePalButton(
                        text = "Start Group",
                        onClick = { viewModel.startGroup() },
                        containerColor = SavePalGreen
                    )
                }

                // Members
                Spacer(Modifier.height(20.dp))
                Text("Members", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(8.dp))

                group.memberships?.forEach { membership ->
                    val member = membership.user ?: return@forEach
                    SavePalCard(modifier = Modifier.padding(vertical = 2.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            AvatarCircle(member.initials, size = 36)
                            Spacer(Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        if (member.id == state.currentUserId) "${member.fullName} (You)" else member.fullName,
                                        style = MaterialTheme.typography.titleSmall
                                    )
                                    if (membership.role == MemberRole.OWNER) {
                                        Spacer(Modifier.width(6.dp))
                                        StatusBadge("Owner", SavePalBlue)
                                    }
                                }
                                membership.payoutPosition?.let {
                                    Text(
                                        "Position #$it",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = SavePalTextSecondary
                                    )
                                }
                            }
                            member.trustScore?.let { score ->
                                Box(
                                    modifier = Modifier
                                        .size(28.dp)
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
                                        style = MaterialTheme.typography.labelSmall,
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
                    }
                }

                // Current Cycle
                state.currentCycle?.let { cycle ->
                    Spacer(Modifier.height(20.dp))
                    Text("Current Cycle", style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(8.dp))

                    SavePalCard {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Cycle #${cycle.cycleNumber}", style = MaterialTheme.typography.titleSmall)
                            cycle.dueDate?.let {
                                Text("Due: ${it.toFormattedDate()}", style = MaterialTheme.typography.bodySmall, color = SavePalTextSecondary)
                            }
                        }

                        cycle.totalAmount?.let {
                            Spacer(Modifier.height(8.dp))
                            Text("Pot: ${it.toCurrency()}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = SavePalGreen)
                        }

                        // Payment progress
                        cycle.payments?.let { payments ->
                            val completed = payments.count { it.status == PaymentStatus.COMPLETED }
                            val total = payments.size
                            if (total > 0) {
                                Spacer(Modifier.height(12.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("Contributions", style = MaterialTheme.typography.bodySmall)
                                    Text("$completed / $total", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold)
                                }
                                Spacer(Modifier.height(4.dp))
                                LinearProgressIndicator(
                                    progress = { completed.toFloat() / total },
                                    modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)),
                                    color = SavePalGreen,
                                    trackColor = SavePalBorder
                                )
                            }

                            // Per-member payment status
                            Spacer(Modifier.height(12.dp))
                            payments.forEach { payment ->
                                val isCurrent = payment.userId == state.currentUserId
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        if (isCurrent) "You" else payment.user?.fullName ?: "Member",
                                        style = MaterialTheme.typography.bodySmall,
                                        fontWeight = if (isCurrent) FontWeight.SemiBold else FontWeight.Normal
                                    )
                                    if (payment.status == PaymentStatus.COMPLETED) {
                                        StatusBadge("Paid", SavePalGreen)
                                    } else if (isCurrent && payment.status == PaymentStatus.PENDING) {
                                        TextButton(onClick = { onNavigateToPayment(payment.id) }) {
                                            Text("Pay Now", color = SavePalBlue)
                                        }
                                    } else {
                                        PaymentStatusBadge(payment.status)
                                    }
                                }
                            }
                        }
                    }
                }

                // Bidding Section
                if (group.payoutMethod == PayoutMethod.BIDDING && state.currentCycle != null) {
                    val cycle = state.currentCycle!!
                    Spacer(Modifier.height(20.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("Bidding", style = MaterialTheme.typography.titleMedium)
                        Spacer(Modifier.width(8.dp))
                        StatusBadge(
                            if (cycle.biddingStatus == BiddingStatus.OPEN) "Open" else "Closed",
                            if (cycle.biddingStatus == BiddingStatus.OPEN) SavePalGreen else SavePalTextSecondary
                        )
                    }
                    Spacer(Modifier.height(8.dp))

                    if (cycle.biddingStatus == BiddingStatus.OPEN) {
                        SavePalCard {
                            Text("Place Your Bid", style = MaterialTheme.typography.titleSmall)
                            Spacer(Modifier.height(8.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                SavePalTextField(
                                    value = state.bidAmount,
                                    onValueChange = { viewModel.updateBidAmount(it) },
                                    label = "Bid Amount ($)",
                                    modifier = Modifier.weight(1f),
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                                )
                                Button(
                                    onClick = { viewModel.placeBid() },
                                    modifier = Modifier.height(56.dp),
                                    enabled = state.bidAmount.isNotBlank()
                                ) {
                                    Text("Bid")
                                }
                            }
                        }
                    }

                    if (state.bids.isNotEmpty()) {
                        Spacer(Modifier.height(8.dp))
                        state.bids.forEach { bid ->
                            SavePalCard(modifier = Modifier.padding(vertical = 2.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(
                                        bid.user?.let { "${it.firstName} ${it.lastName ?: ""}" } ?: "Member",
                                        style = MaterialTheme.typography.bodyMedium
                                    )
                                    Text(
                                        bid.amount?.toCurrency() ?: "",
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                            }
                        }

                        if (state.isOwner && cycle.biddingStatus == BiddingStatus.OPEN) {
                            Spacer(Modifier.height(8.dp))
                            SavePalButton(
                                text = "Resolve Bidding",
                                onClick = { viewModel.resolveBidding() },
                                containerColor = SavePalAmber
                            )
                        }
                    }
                }

                // All Cycles
                if (state.cycles.size > 1) {
                    Spacer(Modifier.height(20.dp))
                    Text("All Cycles", style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(8.dp))
                    state.cycles.forEach { cycle ->
                        SavePalCard(modifier = Modifier.padding(vertical = 2.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Cycle #${cycle.cycleNumber}", style = MaterialTheme.typography.bodyMedium)
                                StatusBadge(
                                    if (cycle.isCompleted) "Completed" else "Active",
                                    if (cycle.isCompleted) SavePalGreen else SavePalBlue
                                )
                            }
                        }
                    }
                }

                // Delete Group
                if (state.isOwner) {
                    Spacer(Modifier.height(32.dp))
                    OutlinedButton(
                        onClick = { showDeleteDialog = true },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = SavePalRed)
                    ) {
                        Icon(Icons.Default.Delete, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Delete Group")
                    }
                }

                Spacer(Modifier.height(24.dp))
            }
        }
    }
}
