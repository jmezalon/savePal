package com.savepal.app.data.repository

import com.savepal.app.data.local.TokenManager
import com.savepal.app.data.model.*
import com.savepal.app.data.remote.ApiService
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val api: ApiService,
    private val tokenManager: TokenManager
) {
    suspend fun login(email: String, password: String): Result<User> = apiCall {
        val response = api.login(LoginRequest(email, password))
        val data = response.data ?: throw Exception(response.error ?: "Login failed")
        tokenManager.saveToken(data.token)
        data.user
    }

    suspend fun register(
        firstName: String, lastName: String, email: String,
        password: String, phone: String?
    ): Result<User> = apiCall {
        val response = api.register(RegisterRequest(firstName, lastName, email, password, phone))
        val data = response.data ?: throw Exception(response.error ?: "Registration failed")
        tokenManager.saveToken(data.token)
        data.user
    }

    suspend fun googleAuth(token: String): Result<User> = apiCall {
        val response = api.googleAuth(GoogleAuthRequest(credential = token))
        val data = response.data ?: throw Exception(response.error ?: "Google auth failed")
        tokenManager.saveToken(data.token)
        data.user
    }

    suspend fun getMe(): Result<User> = apiCall {
        val response = api.getMe()
        response.data ?: throw Exception(response.error ?: "Failed to get user")
    }

    suspend fun updateProfile(request: UpdateProfileRequest): Result<User> = apiCall {
        val response = api.updateProfile(request)
        response.data ?: throw Exception(response.error ?: "Failed to update profile")
    }

    suspend fun updateNotificationPrefs(request: NotificationPrefsRequest): Result<User> = apiCall {
        val response = api.updateNotificationPrefs(request)
        response.data ?: throw Exception(response.error ?: "Failed to update preferences")
    }

    suspend fun changePassword(current: String, new: String): Result<String> = apiCall {
        val response = api.changePassword(ChangePasswordRequest(current, new))
        response.message ?: "Password changed"
    }

    suspend fun forgotPassword(email: String): Result<String> = apiCall {
        val response = api.forgotPassword(ForgotPasswordRequest(email))
        response.message ?: "Reset email sent"
    }

    suspend fun sendPhoneVerification(): Result<String> = apiCall {
        val response = api.sendPhoneVerification()
        response.message ?: "Verification sent"
    }

    suspend fun verifyPhone(code: String): Result<String> = apiCall {
        val response = api.verifyPhone(PhoneVerificationRequest(code))
        response.message ?: "Phone verified"
    }

    suspend fun deleteAccount(): Result<String> = apiCall {
        val response = api.deleteAccount()
        tokenManager.clearToken()
        response.message ?: "Account deleted"
    }

    suspend fun logout() {
        try { api.logout() } catch (_: Exception) {}
        tokenManager.clearToken()
    }

    suspend fun isLoggedIn(): Boolean = tokenManager.getToken() != null
}

internal suspend fun <T> apiCall(block: suspend () -> T): Result<T> {
    return try {
        Result.success(block())
    } catch (e: Exception) {
        Result.failure(e)
    }
}
