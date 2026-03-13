package com.savepal.app.util

import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.*

fun Double.toCurrency(): String {
    val format = NumberFormat.getCurrencyInstance(Locale.US)
    return format.format(this)
}

fun String.toRelativeTime(): String {
    val formats = listOf(
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US),
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US),
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZ", Locale.US),
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssZ", Locale.US)
    )
    formats.forEach { it.timeZone = TimeZone.getTimeZone("UTC") }

    val date = formats.firstNotNullOfOrNull { fmt ->
        try { fmt.parse(this) } catch (_: Exception) { null }
    } ?: return this

    val now = System.currentTimeMillis()
    val diff = now - date.time
    val seconds = diff / 1000
    val minutes = seconds / 60
    val hours = minutes / 60
    val days = hours / 24

    return when {
        seconds < 60 -> "Just now"
        minutes < 60 -> "${minutes}m ago"
        hours < 24 -> "${hours}h ago"
        days < 7 -> "${days}d ago"
        else -> {
            val fmt = SimpleDateFormat("MMM d, yyyy", Locale.US)
            fmt.format(date)
        }
    }
}

fun String.toFormattedDate(): String {
    val formats = listOf(
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US),
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
    )
    formats.forEach { it.timeZone = TimeZone.getTimeZone("UTC") }

    val date = formats.firstNotNullOfOrNull { fmt ->
        try { fmt.parse(this) } catch (_: Exception) { null }
    } ?: return this

    return SimpleDateFormat("MMM d, yyyy", Locale.US).format(date)
}

fun String.toFormattedDateTime(): String {
    val formats = listOf(
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US),
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
    )
    formats.forEach { it.timeZone = TimeZone.getTimeZone("UTC") }

    val date = formats.firstNotNullOfOrNull { fmt ->
        try { fmt.parse(this) } catch (_: Exception) { null }
    } ?: return this

    return SimpleDateFormat("MMM d, yyyy h:mm a", Locale.US).format(date)
}
