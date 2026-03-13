package com.savepal.app.ui.screens.notifications

import androidx.compose.foundation.background
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.savepal.app.data.model.AppNotification
import com.savepal.app.data.model.NotificationType
import com.savepal.app.data.repository.NotificationRepository
import com.savepal.app.ui.components.*
import com.savepal.app.ui.theme.*
import com.savepal.app.util.toRelativeTime
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class NotificationsState(
    val notifications: List<AppNotification> = emptyList(),
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false
)

@HiltViewModel
class NotificationsViewModel @Inject constructor(
    private val notificationRepository: NotificationRepository
) : androidx.lifecycle.ViewModel() {
    private val _state = MutableStateFlow(NotificationsState())
    val state: StateFlow<NotificationsState> = _state.asStateFlow()

    init { load() }

    private fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            notificationRepository.getNotifications().onSuccess { list ->
                _state.update { it.copy(notifications = list) }
            }
            _state.update { it.copy(isLoading = false) }
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _state.update { it.copy(isRefreshing = true) }
            notificationRepository.getNotifications().onSuccess { list ->
                _state.update { it.copy(notifications = list) }
            }
            _state.update { it.copy(isRefreshing = false) }
        }
    }

    fun markRead(id: String) {
        viewModelScope.launch {
            notificationRepository.markRead(id)
            _state.update { s ->
                s.copy(notifications = s.notifications.map {
                    if (it.id == id) it.copy(isRead = true) else it
                })
            }
        }
    }

    fun markAllRead() {
        viewModelScope.launch {
            notificationRepository.markAllRead()
            _state.update { s ->
                s.copy(notifications = s.notifications.map { it.copy(isRead = true) })
            }
        }
    }

    fun delete(id: String) {
        viewModelScope.launch {
            notificationRepository.delete(id)
            _state.update { s ->
                s.copy(notifications = s.notifications.filter { it.id != id })
            }
        }
    }
}

private fun notificationIcon(type: NotificationType): Pair<ImageVector, Color> = when (type) {
    NotificationType.PAYMENT_DUE, NotificationType.AUTO_PAYMENT_SCHEDULED -> Icons.Default.Schedule to SavePalAmber
    NotificationType.PAYMENT_RECEIVED, NotificationType.AUTO_PAYMENT_PROCESSED -> Icons.Default.CheckCircle to SavePalGreen
    NotificationType.PAYOUT_PENDING -> Icons.Default.HourglassTop to SavePalAmber
    NotificationType.PAYOUT_COMPLETED -> Icons.Default.AccountBalance to SavePalGreen
    NotificationType.PAYMENT_FAILED, NotificationType.PAYOUT_FAILED -> Icons.Default.Error to SavePalRed
    NotificationType.GROUP_INVITE -> Icons.Default.PersonAdd to SavePalBlue
    NotificationType.GROUP_STARTED -> Icons.Default.PlayCircle to SavePalBlue
    NotificationType.GROUP_COMPLETED -> Icons.Default.EmojiEvents to SavePalBlue
    NotificationType.CONNECT_ONBOARDING_REQUIRED -> Icons.Default.AccountBalance to SavePalAmber
    NotificationType.REMINDER -> Icons.Default.Notifications to SavePalBlue
    NotificationType.DEBT_RECORDED, NotificationType.DEBT_DEDUCTED_FROM_PAYOUT -> Icons.Default.Warning to SavePalRed
    NotificationType.PAYMENT_DISPUTED -> Icons.Default.Flag to SavePalRed
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen(
    onBack: () -> Unit,
    viewModel: NotificationsViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Notifications") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    if (state.notifications.any { !it.isRead }) {
                        TextButton(onClick = { viewModel.markAllRead() }) {
                            Text("Mark All Read")
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

        if (state.notifications.isEmpty()) {
            EmptyStateView(
                icon = Icons.Default.Notifications,
                title = "No Notifications",
                message = "You're all caught up!",
                modifier = Modifier.padding(padding)
            )
            return@Scaffold
        }

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
                state.notifications.forEach { notification ->
                    val (icon, color) = notificationIcon(notification.type)

                    SavePalCard(modifier = Modifier.padding(vertical = 4.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.Top
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(color.copy(alpha = 0.12f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(18.dp))
                            }
                            Spacer(Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        notification.title,
                                        style = MaterialTheme.typography.titleSmall,
                                        modifier = Modifier.weight(1f)
                                    )
                                    if (!notification.isRead) {
                                        Spacer(Modifier.width(8.dp))
                                        Box(
                                            modifier = Modifier
                                                .size(8.dp)
                                                .clip(CircleShape)
                                                .background(SavePalBlue)
                                        )
                                    }
                                }
                                Spacer(Modifier.height(2.dp))
                                Text(
                                    notification.message,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = SavePalTextSecondary
                                )
                                Spacer(Modifier.height(4.dp))
                                Row {
                                    notification.group?.let {
                                        Text(it.name, style = MaterialTheme.typography.labelSmall, color = SavePalBlue)
                                        Text(" - ", style = MaterialTheme.typography.labelSmall, color = SavePalTextTertiary)
                                    }
                                    Text(
                                        notification.createdAt?.toRelativeTime() ?: "",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = SavePalTextTertiary
                                    )
                                }
                            }
                            Column {
                                if (!notification.isRead) {
                                    IconButton(
                                        onClick = { viewModel.markRead(notification.id) },
                                        modifier = Modifier.size(24.dp)
                                    ) {
                                        Icon(Icons.Default.DoneAll, contentDescription = "Mark read", modifier = Modifier.size(16.dp), tint = SavePalTextTertiary)
                                    }
                                }
                                IconButton(
                                    onClick = { viewModel.delete(notification.id) },
                                    modifier = Modifier.size(24.dp)
                                ) {
                                    Icon(Icons.Default.Close, contentDescription = "Delete", modifier = Modifier.size(16.dp), tint = SavePalTextTertiary)
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
