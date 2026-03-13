package com.savepal.app.data.repository

import com.savepal.app.data.model.*
import com.savepal.app.data.remote.ApiService
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NotificationRepository @Inject constructor(
    private val api: ApiService
) {
    suspend fun getNotifications(): Result<List<AppNotification>> = apiCall {
        api.getNotifications().data ?: emptyList()
    }

    suspend fun getUnreadCount(): Result<Int> = apiCall {
        api.getUnreadCount().data?.count ?: 0
    }

    suspend fun markRead(id: String): Result<String> = apiCall {
        api.markNotificationRead(id).message ?: "Read"
    }

    suspend fun markAllRead(): Result<String> = apiCall {
        api.markAllRead().message ?: "All read"
    }

    suspend fun delete(id: String): Result<String> = apiCall {
        api.deleteNotification(id).message ?: "Deleted"
    }

    suspend fun registerDeviceToken(token: String): Result<String> = apiCall {
        api.registerDeviceToken(DeviceTokenRequest(token)).message ?: "Registered"
    }

    suspend fun unregisterDeviceToken(token: String): Result<String> = apiCall {
        api.unregisterDeviceToken(DeviceTokenRequest(token)).message ?: "Unregistered"
    }
}
