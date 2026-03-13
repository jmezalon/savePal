package com.savepal.app.util

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessaging
import com.savepal.app.data.repository.NotificationRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PushNotificationHelper @Inject constructor(
    @ApplicationContext private val context: Context,
    private val notificationRepository: NotificationRepository
) {
    fun hasNotificationPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                context, Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
    }

    suspend fun registerCurrentToken() {
        try {
            val token = FirebaseMessaging.getInstance().token.await()
            notificationRepository.registerDeviceToken(token)
        } catch (e: Exception) {
            Log.e("PushNotification", "Failed to register FCM token", e)
        }
    }

    suspend fun unregisterCurrentToken() {
        try {
            val token = FirebaseMessaging.getInstance().token.await()
            notificationRepository.unregisterDeviceToken(token)
        } catch (e: Exception) {
            Log.e("PushNotification", "Failed to unregister FCM token", e)
        }
    }
}
