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
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
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

                    val payments = cycle.payments ?: emptyList()
                    val completedCount = payments.count { it.status == PaymentStatus.COMPLETED }
                    val totalCount = payments.size
                    val progress = if (totalCount > 0) completedCount.toFloat() / totalCount else 0f

                    // Group payments by member
                    val memberGroups = payments
                        .groupBy { it.userId }
                        .map { (userId, memberPayments) ->
                            val user = memberPayments.firstNotNullOfOrNull { it.user }
                            Triple(userId, user, memberPayments)
                        }
                        .sortedBy { it.third.firstOrNull()?.contributionPeriod ?: 0 }

                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        color = SavePalBlueLight.copy(alpha = 0.3f),
                        border = androidx.compose.foundation.BorderStroke(1.dp, SavePalBlue.copy(alpha = 0.15f))
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            // Header: cycle info + progress ring
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.Top
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        "Cycle ${cycle.cycleNumber}",
                                        style = MaterialTheme.typography.titleLarge,
                                        fontWeight = FontWeight.Bold
                                    )
                                    cycle.dueDate?.let {
                                        Spacer(Modifier.height(4.dp))
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(
                                                Icons.Default.CalendarToday,
                                                contentDescription = null,
                                                modifier = Modifier.size(14.dp),
                                                tint = SavePalTextSecondary
                                            )
                                            Spacer(Modifier.width(4.dp))
                                            Text(
                                                "Due: ${it.toFormattedDate()}",
                                                style = MaterialTheme.typography.bodySmall,
                                                color = SavePalTextSecondary
                                            )
                                        }
                                    }
                                    cycle.totalAmount?.let {
                                        Spacer(Modifier.height(2.dp))
                                        Text(
                                            "Payout: ${it.toCurrency()}",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = SavePalTextSecondary
                                        )
                                    }
                                }

                                // Circular progress ring
                                if (totalCount > 0) {
                                    Box(
                                        contentAlignment = Alignment.Center,
                                        modifier = Modifier.size(56.dp)
                                    ) {
                                        CircularProgressIndicator(
                                            progress = { 1f },
                                            modifier = Modifier.fillMaxSize(),
                                            color = SavePalBorder,
                                            strokeWidth = 5.dp
                                        )
                                        CircularProgressIndicator(
                                            progress = { progress },
                                            modifier = Modifier.fillMaxSize(),
                                            color = SavePalBlue,
                                            strokeWidth = 5.dp,
                                            strokeCap = androidx.compose.ui.graphics.StrokeCap.Round
                                        )
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                            Text(
                                                "$completedCount",
                                                style = MaterialTheme.typography.labelMedium,
                                                fontWeight = FontWeight.Bold
                                            )
                                            Text(
                                                "/$totalCount",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = SavePalTextSecondary
                                            )
                                        }
                                    }
                                }
                            }

                            // Contribution period bars
                            val periods = memberGroups.firstOrNull()?.third?.size ?: 0
                            if (periods > 1) {
                                Spacer(Modifier.height(16.dp))
                                Text(
                                    "Contribution Periods",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = SavePalTextSecondary
                                )
                                Spacer(Modifier.height(6.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    for (period in 1..periods) {
                                        val periodPayments = payments.filter { it.contributionPeriod == period }
                                        val periodCompleted = periodPayments.count { it.status == PaymentStatus.COMPLETED }
                                        val periodTotal = periodPayments.size
                                        val allDone = periodCompleted == periodTotal && periodTotal > 0
                                        val someStarted = periodCompleted > 0

                                        Column(
                                            modifier = Modifier.weight(1f),
                                            horizontalAlignment = Alignment.CenterHorizontally
                                        ) {
                                            Box(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .height(6.dp)
                                                    .clip(RoundedCornerShape(3.dp))
                                                    .background(
                                                        when {
                                                            allDone -> SavePalGreen
                                                            someStarted -> SavePalGreen.copy(alpha = 0.4f)
                                                            else -> SavePalBorder
                                                        }
                                                    )
                                            )
                                            Spacer(Modifier.height(2.dp))
                                            Text(
                                                "Wk $period",
                                                style = MaterialTheme.typography.labelSmall.copy(
                                                    fontSize = androidx.compose.ui.unit.TextUnit(9f, androidx.compose.ui.unit.TextUnitType.Sp)
                                                ),
                                                color = SavePalTextSecondary
                                            )
                                        }
                                    }
                                }
                            }

                            // Divider
                            Spacer(Modifier.height(16.dp))
                            HorizontalDivider(color = SavePalBlue.copy(alpha = 0.12f))
                            Spacer(Modifier.height(12.dp))

                            // Member summary rows
                            memberGroups.forEach { (userId, user, memberPayments) ->
                                val isCurrentUser = userId == state.currentUserId
                                val memberCompleted = memberPayments.count { it.status == PaymentStatus.COMPLETED }
                                val memberTotal = memberPayments.size
                                val memberProgress = if (memberTotal > 0) memberCompleted.toFloat() / memberTotal else 0f
                                val nextPending = memberPayments.firstOrNull { it.status == PaymentStatus.PENDING }

                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    // Avatar
                                    AvatarCircle(
                                        initials = user?.initials ?: "?",
                                        size = 32
                                    )
                                    Spacer(Modifier.width(10.dp))

                                    // Name + mini progress bar
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            if (isCurrentUser) "You" else user?.fullName ?: "Member",
                                            style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = if (isCurrentUser) FontWeight.SemiBold else FontWeight.Normal
                                        )
                                        Spacer(Modifier.height(4.dp))
                                        LinearProgressIndicator(
                                            progress = { memberProgress },
                                            modifier = Modifier.fillMaxWidth().height(4.dp).clip(RoundedCornerShape(2.dp)),
                                            color = if (memberCompleted == memberTotal) SavePalGreen else SavePalBlue,
                                            trackColor = SavePalBorder.copy(alpha = 0.5f)
                                        )
                                    }
                                    Spacer(Modifier.width(10.dp))

                                    // Status
                                    if (memberCompleted == memberTotal) {
                                        StatusBadge("Done", SavePalGreen)
                                    } else if (isCurrentUser && nextPending != null) {
                                        Button(
                                            onClick = { onNavigateToPayment(nextPending.id) },
                                            colors = ButtonDefaults.buttonColors(containerColor = SavePalBlue),
                                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                                            shape = RoundedCornerShape(8.dp),
                                            modifier = Modifier.height(30.dp)
                                        ) {
                                            Text("Pay Now", style = MaterialTheme.typography.labelSmall)
                                        }
                                    } else {
                                        Text(
                                            "$memberCompleted/$memberTotal",
                                            style = MaterialTheme.typography.labelMedium,
                                            fontWeight = FontWeight.Medium,
                                            color = SavePalTextSecondary
                                        )
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

                // Delete Group (only for non-active groups)
                if (state.isOwner && group.status != GroupStatus.ACTIVE) {
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
