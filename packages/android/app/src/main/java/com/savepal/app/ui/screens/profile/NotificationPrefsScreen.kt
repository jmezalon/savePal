package com.savepal.app.ui.screens.profile

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.savepal.app.data.model.NotificationPrefsRequest
import com.savepal.app.data.repository.AuthRepository
import com.savepal.app.ui.components.*
import com.savepal.app.ui.screens.auth.AuthViewModel
import com.savepal.app.ui.theme.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class NotificationPrefsViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : androidx.lifecycle.ViewModel() {
    private val _email = MutableStateFlow(true)
    val email: StateFlow<Boolean> = _email
    private val _push = MutableStateFlow(true)
    val push: StateFlow<Boolean> = _push
    private val _sms = MutableStateFlow(false)
    val sms: StateFlow<Boolean> = _sms
    private val _saved = MutableStateFlow(false)
    val saved: StateFlow<Boolean> = _saved

    fun init(e: Boolean, p: Boolean, s: Boolean) { _email.value = e; _push.value = p; _sms.value = s }
    fun toggleEmail(v: Boolean) { _email.value = v }
    fun togglePush(v: Boolean) { _push.value = v }
    fun toggleSms(v: Boolean) { _sms.value = v }

    fun save() {
        viewModelScope.launch {
            authRepository.updateNotificationPrefs(
                NotificationPrefsRequest(_email.value, _sms.value, _push.value)
            ).onSuccess { _saved.value = true }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationPrefsScreen(
    onBack: () -> Unit,
    viewModel: NotificationPrefsViewModel = hiltViewModel(),
    authViewModel: AuthViewModel = hiltViewModel()
) {
    val user by authViewModel.user.collectAsStateWithLifecycle()
    val email by viewModel.email.collectAsStateWithLifecycle()
    val push by viewModel.push.collectAsStateWithLifecycle()
    val sms by viewModel.sms.collectAsStateWithLifecycle()
    val saved by viewModel.saved.collectAsStateWithLifecycle()

    LaunchedEffect(user) {
        user?.let { viewModel.init(it.emailNotifications, it.pushNotifications, it.smsNotifications) }
    }
    LaunchedEffect(saved) {
        if (saved) { authViewModel.refreshUser(); onBack() }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Notifications") },
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
                .padding(16.dp)
        ) {
            SavePalCard {
                Row(modifier = Modifier.fillMaxWidth()) {
                    Text("Email Notifications", modifier = Modifier.weight(1f))
                    Switch(checked = email, onCheckedChange = { viewModel.toggleEmail(it) })
                }
            }
            Spacer(Modifier.height(8.dp))
            SavePalCard {
                Row(modifier = Modifier.fillMaxWidth()) {
                    Text("Push Notifications", modifier = Modifier.weight(1f))
                    Switch(checked = push, onCheckedChange = { viewModel.togglePush(it) })
                }
            }
            Spacer(Modifier.height(8.dp))
            SavePalCard {
                Row(modifier = Modifier.fillMaxWidth()) {
                    Text("SMS Notifications", modifier = Modifier.weight(1f))
                    Switch(checked = sms, onCheckedChange = { viewModel.toggleSms(it) })
                }
            }
            Spacer(Modifier.height(32.dp))
            SavePalButton(text = "Save Preferences", onClick = { viewModel.save() })
        }
    }
}
