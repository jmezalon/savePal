package com.savepal.app.ui.navigation

object Routes {
    const val ONBOARDING = "onboarding"
    const val LOGIN = "login"
    const val REGISTER = "register"
    const val FORGOT_PASSWORD = "forgot_password"

    const val MAIN = "main"
    const val DASHBOARD = "dashboard"
    const val GROUPS = "groups"
    const val PAYMENTS = "payments"
    const val PROFILE = "profile"

    const val CREATE_GROUP = "create_group"
    const val JOIN_GROUP = "join_group"
    const val GROUP_DETAIL = "group_detail/{groupId}"
    const val MAKE_PAYMENT = "make_payment/{paymentId}"
    const val NOTIFICATIONS = "notifications"
    const val ADD_CARD = "add_card"
    const val PAYMENT_METHODS = "payment_methods"
    const val BANK_ACCOUNT = "bank_account"
    const val EDIT_PROFILE = "edit_profile"
    const val CHANGE_PASSWORD = "change_password"
    const val NOTIFICATION_PREFS = "notification_prefs"
    const val HELP = "help"

    fun groupDetail(id: String) = "group_detail/$id"
    fun makePayment(id: String) = "make_payment/$id"
}
