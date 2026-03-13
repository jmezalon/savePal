package com.savepal.app.ui

import androidx.compose.runtime.*
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.rememberNavController
import com.savepal.app.ui.components.LoadingView
import com.savepal.app.ui.navigation.AppNavGraph
import com.savepal.app.ui.navigation.Routes
import com.savepal.app.ui.screens.auth.AuthViewModel

@Composable
fun SavePalRoot(authViewModel: AuthViewModel = hiltViewModel()) {
    val authState by authViewModel.authState.collectAsStateWithLifecycle()
    val hasOnboarded by authViewModel.hasOnboarded.collectAsStateWithLifecycle()
    val navController = rememberNavController()

    when (authState) {
        AuthViewModel.AuthState.Loading -> LoadingView()
        AuthViewModel.AuthState.Authenticated -> {
            AppNavGraph(navController = navController, startDestination = Routes.MAIN)
        }
        AuthViewModel.AuthState.Unauthenticated -> {
            val start = if (hasOnboarded) Routes.LOGIN else Routes.ONBOARDING
            AppNavGraph(navController = navController, startDestination = start)
        }
    }
}
