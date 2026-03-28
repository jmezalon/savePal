package com.savepal.app.ui.screens.groups

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
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.savepal.app.ui.components.*
import com.savepal.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GroupsListScreen(
    modifier: Modifier = Modifier,
    onNavigateToGroup: (String) -> Unit,
    onNavigateToCreateGroup: () -> Unit,
    onNavigateToJoinGroup: () -> Unit,
    viewModel: GroupsViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var showMenu by remember { mutableStateOf(false) }

    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                viewModel.refresh()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(SavePalBackground)
            .systemBarsPadding()
    ) {
        // Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Groups", style = MaterialTheme.typography.headlineMedium)
            Box {
                IconButton(onClick = { showMenu = true }) {
                    Icon(Icons.Default.Add, contentDescription = "Add")
                }
                DropdownMenu(expanded = showMenu, onDismissRequest = { showMenu = false }) {
                    DropdownMenuItem(
                        text = { Text("Create Group") },
                        onClick = { showMenu = false; onNavigateToCreateGroup() },
                        leadingIcon = { Icon(Icons.Default.GroupAdd, contentDescription = null) }
                    )
                    DropdownMenuItem(
                        text = { Text("Join Group") },
                        onClick = { showMenu = false; onNavigateToJoinGroup() },
                        leadingIcon = { Icon(Icons.Default.Login, contentDescription = null) }
                    )
                }
            }
        }

        // Action buttons
        if (!state.isLoading) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .padding(bottom = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedButton(
                    onClick = onNavigateToJoinGroup,
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = SavePalBlue)
                ) {
                    Icon(Icons.Default.Login, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Join Group")
                }
                Button(
                    onClick = onNavigateToCreateGroup,
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = SavePalBlue)
                ) {
                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Create Group")
                }
            }
        }

        if (state.isLoading) {
            LoadingView()
        } else if (state.groups.isEmpty()) {
            EmptyStateView(
                icon = Icons.Default.Groups,
                title = "No Groups Yet",
                message = "Create a new savings group or join an existing one to get started."
            )
        } else {
            PullToRefreshBox(
                isRefreshing = state.isRefreshing,
                onRefresh = { viewModel.refresh() }
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    state.groups.forEach { group ->
                        SavePalCard(
                            modifier = Modifier.clickable { onNavigateToGroup(group.id) }
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.Top
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(group.name, style = MaterialTheme.typography.titleMedium)
                                        Spacer(Modifier.width(8.dp))
                                        GroupStatusBadge(group.status)
                                    }
                                    if (!group.description.isNullOrBlank()) {
                                        Spacer(Modifier.height(4.dp))
                                        Text(
                                            group.description,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = SavePalTextSecondary,
                                            maxLines = 2
                                        )
                                    }
                                    Spacer(Modifier.height(8.dp))
                                    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(
                                                Icons.Default.AttachMoney,
                                                contentDescription = null,
                                                modifier = Modifier.size(16.dp),
                                                tint = SavePalTextSecondary
                                            )
                                            Text(
                                                group.formattedContribution,
                                                style = MaterialTheme.typography.bodySmall,
                                                color = SavePalTextSecondary
                                            )
                                        }
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(
                                                Icons.Default.People,
                                                contentDescription = null,
                                                modifier = Modifier.size(16.dp),
                                                tint = SavePalTextSecondary
                                            )
                                            Text(
                                                "${group.currentMembers}/${group.maxMembers}",
                                                style = MaterialTheme.typography.bodySmall,
                                                color = SavePalTextSecondary
                                            )
                                        }
                                        Text(
                                            group.frequency.name.lowercase().replaceFirstChar { it.uppercase() },
                                            style = MaterialTheme.typography.bodySmall,
                                            color = SavePalTextSecondary
                                        )
                                    }
                                }
                                Icon(
                                    Icons.Default.ChevronRight,
                                    contentDescription = null,
                                    tint = SavePalTextTertiary
                                )
                            }
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                }
            }
        }
    }
}
