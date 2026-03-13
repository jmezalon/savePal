package com.savepal.app.ui.screens.payments

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.savepal.app.data.model.PaymentStatus
import com.savepal.app.ui.components.*
import com.savepal.app.ui.theme.*
import com.savepal.app.util.toCurrency
import com.savepal.app.util.toFormattedDate

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaymentHistoryScreen(
    modifier: Modifier = Modifier,
    onNavigateToPayment: (String) -> Unit,
    viewModel: PaymentHistoryViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var selectedTab by remember { mutableIntStateOf(0) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(SavePalBackground)
            .systemBarsPadding()
    ) {
        Text(
            "Payments",
            style = MaterialTheme.typography.headlineMedium,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)
        )

        // Tabs
        TabRow(selectedTabIndex = selectedTab) {
            Tab(selected = selectedTab == 0, onClick = { selectedTab = 0 }) {
                Text("Payments", modifier = Modifier.padding(12.dp))
            }
            Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 }) {
                Text("Payouts", modifier = Modifier.padding(12.dp))
            }
        }

        if (state.isLoading) {
            LoadingView()
        } else {
            PullToRefreshBox(
                isRefreshing = state.isRefreshing,
                onRefresh = { viewModel.refresh() }
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp)
                ) {
                    if (selectedTab == 0) {
                        // Payment Stats
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            SavePalCard(modifier = Modifier.weight(1f)) {
                                Text(
                                    (state.paymentStats?.paidAmount ?: 0.0).toCurrency(),
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = SavePalGreen
                                )
                                Text("Total Paid", style = MaterialTheme.typography.bodySmall, color = SavePalTextSecondary)
                            }
                            SavePalCard(modifier = Modifier.weight(1f)) {
                                Text(
                                    "${state.paymentStats?.pending ?: 0}",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = SavePalAmber
                                )
                                Text("Pending", style = MaterialTheme.typography.bodySmall, color = SavePalTextSecondary)
                            }
                        }

                        Spacer(Modifier.height(16.dp))

                        if (state.payments.isEmpty()) {
                            EmptyStateView(
                                icon = Icons.Default.Payment,
                                title = "No Payments",
                                message = "Your payment history will appear here."
                            )
                        } else {
                            state.payments.forEach { payment ->
                                SavePalCard(
                                    modifier = Modifier
                                        .padding(vertical = 4.dp)
                                        .then(
                                            if (payment.status == PaymentStatus.PENDING)
                                                Modifier.clickable { onNavigateToPayment(payment.id) }
                                            else Modifier
                                        )
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                payment.cycle?.group?.name ?: "Payment",
                                                style = MaterialTheme.typography.titleSmall
                                            )
                                            Text(
                                                "Cycle ${payment.cycle?.cycleNumber ?: ""}" +
                                                    (payment.paidAt?.let { " - ${it.toFormattedDate()}" } ?: ""),
                                                style = MaterialTheme.typography.bodySmall,
                                                color = SavePalTextSecondary
                                            )
                                        }
                                        Column(horizontalAlignment = Alignment.End) {
                                            Text(
                                                payment.formattedAmount,
                                                style = MaterialTheme.typography.titleSmall,
                                                fontWeight = FontWeight.SemiBold
                                            )
                                            PaymentStatusBadge(payment.status)
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        // Payout Stats
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            SavePalCard(modifier = Modifier.weight(1f)) {
                                Text(
                                    (state.payoutStats?.receivedAmount ?: 0.0).toCurrency(),
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = SavePalGreen
                                )
                                Text("Received", style = MaterialTheme.typography.bodySmall, color = SavePalTextSecondary)
                            }
                            SavePalCard(modifier = Modifier.weight(1f)) {
                                Text(
                                    "${state.payoutStats?.pending ?: 0}",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = SavePalAmber
                                )
                                Text("Pending", style = MaterialTheme.typography.bodySmall, color = SavePalTextSecondary)
                            }
                        }

                        Spacer(Modifier.height(16.dp))

                        if (state.payouts.isEmpty()) {
                            EmptyStateView(
                                icon = Icons.Default.AccountBalance,
                                title = "No Payouts",
                                message = "Your payout history will appear here."
                            )
                        } else {
                            state.payouts.forEach { payout ->
                                SavePalCard(modifier = Modifier.padding(vertical = 4.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                payout.cycle?.group?.name ?: "Payout",
                                                style = MaterialTheme.typography.titleSmall
                                            )
                                            Text(
                                                "Cycle ${payout.cycle?.cycleNumber ?: ""}",
                                                style = MaterialTheme.typography.bodySmall,
                                                color = SavePalTextSecondary
                                            )
                                        }
                                        Column(horizontalAlignment = Alignment.End) {
                                            Text(
                                                payout.formattedNetAmount,
                                                style = MaterialTheme.typography.titleSmall,
                                                fontWeight = FontWeight.SemiBold,
                                                color = SavePalGreen
                                            )
                                            PayoutStatusBadge(payout.status)
                                        }
                                    }
                                    if (payout.status == com.savepal.app.data.model.PayoutStatus.FAILED) {
                                        Spacer(Modifier.height(8.dp))
                                        TextButton(onClick = { viewModel.retryPayout(payout.id) }) {
                                            Text("Retry Payout", color = SavePalBlue)
                                        }
                                    }
                                }
                            }
                        }
                    }
                    Spacer(Modifier.height(16.dp))
                }
            }
        }
    }
}
