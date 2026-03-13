package com.savepal.app

import android.app.Application
import com.savepal.app.util.StripeHelper
import dagger.hilt.android.HiltAndroidApp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltAndroidApp
class SavePalApp : Application() {

    @Inject lateinit var stripeHelper: StripeHelper

    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    override fun onCreate() {
        super.onCreate()
        appScope.launch { stripeHelper.initialize() }
    }
}
