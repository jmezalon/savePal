package com.savepal.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.savepal.app.ui.screens.auth.*
import com.savepal.app.ui.screens.dashboard.DashboardScreen
import com.savepal.app.ui.screens.groups.*
import com.savepal.app.ui.screens.help.HelpScreen
import com.savepal.app.ui.screens.notifications.NotificationsScreen
import com.savepal.app.ui.screens.onboarding.OnboardingScreen
import com.savepal.app.ui.screens.payments.*
import com.savepal.app.ui.screens.profile.*

@Composable
fun AppNavGraph(
    navController: NavHostController,
    startDestination: String,
    authViewModel: AuthViewModel
) {
    NavHost(navController = navController, startDestination = startDestination) {

        composable(Routes.ONBOARDING) {
            OnboardingScreen(
                onComplete = {
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(Routes.ONBOARDING) { inclusive = true }
                    }
                }
            )
        }

        composable(Routes.LOGIN) {
            LoginScreen(
                viewModel = authViewModel,
                onNavigateToRegister = { navController.navigate(Routes.REGISTER) },
                onNavigateToForgotPassword = { navController.navigate(Routes.FORGOT_PASSWORD) },
                onLoginSuccess = {
                    navController.navigate(Routes.MAIN) {
                        popUpTo(navController.graph.id) { inclusive = true }
                    }
                }
            )
        }

        composable(Routes.REGISTER) {
            RegisterScreen(
                viewModel = authViewModel,
                onNavigateToLogin = { navController.popBackStack() },
                onRegisterSuccess = {
                    navController.navigate(Routes.MAIN) {
                        popUpTo(navController.graph.id) { inclusive = true }
                    }
                }
            )
        }

        composable(Routes.FORGOT_PASSWORD) {
            ForgotPasswordScreen(onBack = { navController.popBackStack() })
        }

        composable(Routes.MAIN) {
            MainScreen(navController = navController, authViewModel = authViewModel)
        }

        composable(Routes.CREATE_GROUP) {
            CreateGroupScreen(
                onBack = { navController.popBackStack() },
                onGroupCreated = { navController.popBackStack() }
            )
        }

        composable(Routes.JOIN_GROUP) {
            JoinGroupScreen(
                onBack = { navController.popBackStack() },
                onJoined = { navController.popBackStack() }
            )
        }

        composable(
            Routes.GROUP_DETAIL,
            arguments = listOf(navArgument("groupId") { type = NavType.StringType })
        ) { backStackEntry ->
            val groupId = backStackEntry.arguments?.getString("groupId") ?: return@composable
            GroupDetailScreen(
                groupId = groupId,
                onBack = { navController.popBackStack() },
                onNavigateToPayment = { paymentId ->
                    navController.navigate(Routes.makePayment(paymentId))
                }
            )
        }

        composable(
            Routes.MAKE_PAYMENT,
            arguments = listOf(navArgument("paymentId") { type = NavType.StringType })
        ) { backStackEntry ->
            val paymentId = backStackEntry.arguments?.getString("paymentId") ?: return@composable
            MakePaymentScreen(
                paymentId = paymentId,
                onBack = { navController.popBackStack() },
                onPaymentSuccess = { navController.popBackStack() }
            )
        }

        composable(Routes.NOTIFICATIONS) {
            NotificationsScreen(onBack = { navController.popBackStack() })
        }

        composable(Routes.PAYMENT_METHODS) {
            PaymentMethodsScreen(
                onBack = { navController.popBackStack() }
            )
        }

        composable(Routes.BANK_ACCOUNT) {
            BankAccountScreen(onBack = { navController.popBackStack() })
        }

        composable(Routes.EDIT_PROFILE) {
            EditProfileScreen(onBack = { navController.popBackStack() })
        }

        composable(Routes.CHANGE_PASSWORD) {
            ChangePasswordScreen(onBack = { navController.popBackStack() })
        }

        composable(Routes.NOTIFICATION_PREFS) {
            NotificationPrefsScreen(onBack = { navController.popBackStack() })
        }

        composable(Routes.HELP) {
            HelpScreen(onBack = { navController.popBackStack() })
        }
    }
}
