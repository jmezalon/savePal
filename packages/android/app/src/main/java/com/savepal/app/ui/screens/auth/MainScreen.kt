package com.savepal.app.ui.screens.auth

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavHostController
import com.savepal.app.ui.screens.dashboard.DashboardScreen
import com.savepal.app.ui.screens.groups.GroupsListScreen
import com.savepal.app.ui.screens.payments.PaymentHistoryScreen
import com.savepal.app.ui.screens.profile.ProfileScreen
import com.savepal.app.ui.navigation.Routes
import com.savepal.app.ui.theme.SavePalBlue

private enum class Tab(
    val label: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector
) {
    Dashboard("Home", Icons.Filled.Home, Icons.Outlined.Home),
    Groups("Groups", Icons.Filled.Groups, Icons.Outlined.Groups),
    Payments("Payments", Icons.Filled.Payment, Icons.Outlined.Payment),
    Profile("Profile", Icons.Filled.Person, Icons.Outlined.Person)
}

@Composable
fun MainScreen(navController: NavHostController) {
    var selectedTab by remember { mutableStateOf(Tab.Dashboard) }

    Scaffold(
        bottomBar = {
            NavigationBar {
                Tab.entries.forEach { tab ->
                    NavigationBarItem(
                        selected = selectedTab == tab,
                        onClick = { selectedTab = tab },
                        icon = {
                            Icon(
                                if (selectedTab == tab) tab.selectedIcon else tab.unselectedIcon,
                                contentDescription = tab.label
                            )
                        },
                        label = { Text(tab.label) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = SavePalBlue,
                            selectedTextColor = SavePalBlue,
                            indicatorColor = SavePalBlue.copy(alpha = 0.12f)
                        )
                    )
                }
            }
        }
    ) { padding ->
        when (selectedTab) {
            Tab.Dashboard -> DashboardScreen(
                modifier = Modifier.padding(padding),
                onNavigateToNotifications = { navController.navigate(Routes.NOTIFICATIONS) },
                onNavigateToGroup = { navController.navigate(Routes.groupDetail(it)) },
                onNavigateToPayment = { navController.navigate(Routes.makePayment(it)) },
                onNavigateToGroups = { selectedTab = Tab.Groups },
                onNavigateToCreateGroup = { navController.navigate(Routes.CREATE_GROUP) },
                onNavigateToJoinGroup = { navController.navigate(Routes.JOIN_GROUP) }
            )
            Tab.Groups -> GroupsListScreen(
                modifier = Modifier.padding(padding),
                onNavigateToGroup = { navController.navigate(Routes.groupDetail(it)) },
                onNavigateToCreateGroup = { navController.navigate(Routes.CREATE_GROUP) },
                onNavigateToJoinGroup = { navController.navigate(Routes.JOIN_GROUP) }
            )
            Tab.Payments -> PaymentHistoryScreen(
                modifier = Modifier.padding(padding),
                onNavigateToPayment = { navController.navigate(Routes.makePayment(it)) }
            )
            Tab.Profile -> ProfileScreen(
                modifier = Modifier.padding(padding),
                onNavigateToEditProfile = { navController.navigate(Routes.EDIT_PROFILE) },
                onNavigateToChangePassword = { navController.navigate(Routes.CHANGE_PASSWORD) },
                onNavigateToNotificationPrefs = { navController.navigate(Routes.NOTIFICATION_PREFS) },
                onNavigateToPaymentMethods = { navController.navigate(Routes.PAYMENT_METHODS) },
                onNavigateToBankAccount = { navController.navigate(Routes.BANK_ACCOUNT) },
                onNavigateToHelp = { navController.navigate(Routes.HELP) },
                onLogout = {
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }
    }
}
