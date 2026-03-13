package com.savepal.app.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColorScheme = lightColorScheme(
    primary = SavePalBlue,
    onPrimary = Color.White,
    primaryContainer = SavePalBlueLight,
    onPrimaryContainer = SavePalBlueDark,
    secondary = SavePalGreen,
    onSecondary = Color.White,
    secondaryContainer = SavePalGreenLight,
    onSecondaryContainer = SavePalGreen,
    tertiary = SavePalAmber,
    onTertiary = Color.White,
    tertiaryContainer = SavePalAmberLight,
    error = SavePalRed,
    onError = Color.White,
    errorContainer = SavePalRedLight,
    background = SavePalBackground,
    onBackground = SavePalText,
    surface = SavePalSurface,
    onSurface = SavePalText,
    surfaceVariant = SavePalBackground,
    onSurfaceVariant = SavePalTextSecondary,
    outline = SavePalBorder,
    outlineVariant = SavePalBorder,
)

@Composable
fun SavePalTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = LightColorScheme,
        typography = Typography,
        content = content
    )
}
