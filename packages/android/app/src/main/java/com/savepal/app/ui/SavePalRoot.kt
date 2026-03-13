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

    when (authState) {
        AuthViewModel.AuthState.Loading -> LoadingView()
        else -> {
            // Determine initial start destination only once
            val initialAuth = authState == AuthViewModel.AuthState.Authenticated
            val startDestination = remember {
                if (initialAuth) Routes.MAIN
                else if (hasOnboarded) Routes.LOGIN
                else Routes.ONBOARDING
            }
            val navController = rememberNavController()

            // React to auth state changes for logout/session expiry
            LaunchedEffect(authState) {
                if (authState == AuthViewModel.AuthState.Unauthenticated) {
                    val currentRoute = navController.currentDestination?.route
                    if (currentRoute != null &&
                        currentRoute != Routes.LOGIN &&
                        currentRoute != Routes.REGISTER &&
                        currentRoute != Routes.ONBOARDING &&
                        currentRoute != Routes.FORGOT_PASSWORD
                    ) {
                        val target = if (hasOnboarded) Routes.LOGIN else Routes.ONBOARDING
                        navController.navigate(target) {
                            popUpTo(navController.graph.id) { inclusive = true }
                        }
                    }
                }
            }

            AppNavGraph(navController = navController, startDestination = startDestination, authViewModel = authViewModel)
        }
    }
}
