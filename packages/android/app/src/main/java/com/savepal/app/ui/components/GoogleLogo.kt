package com.savepal.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.unit.dp

private val GoogleBlue = Color(0xFF4285F4)
private val GoogleGreen = Color(0xFF34A853)
private val GoogleYellow = Color(0xFFFBBC05)
private val GoogleRed = Color(0xFFEA4335)

@Composable
fun GoogleLogo(modifier: Modifier = Modifier) {
    Canvas(modifier = modifier.size(18.dp)) {
        val w = size.width
        val h = size.height
        val cx = w / 2f
        val cy = h / 2f
        val r = minOf(w, h) / 2f
        val innerR = r * 0.55f
        val barH = r * 0.38f

        // Blue (right arc: -45° to 45°)
        drawArcWedge(cx, cy, r, -45f, 90f, GoogleBlue)

        // Green (bottom-right arc: 45° to 135°)
        drawArcWedge(cx, cy, r, 45f, 90f, GoogleGreen)

        // Yellow (bottom-left arc: 135° to 225°)
        drawArcWedge(cx, cy, r, 135f, 90f, GoogleYellow)

        // Red (top-left arc: 225° to 315°)
        drawArcWedge(cx, cy, r, 225f, 90f, GoogleRed)

        // White center circle
        drawCircle(Color.White, radius = innerR, center = Offset(cx, cy))

        // Horizontal bar (the Google "G" crossbar) - blue color
        drawRect(
            color = GoogleBlue,
            topLeft = Offset(cx, cy - barH / 2f),
            size = Size(r * 0.95f, barH)
        )
    }
}

private fun DrawScope.drawArcWedge(
    cx: Float, cy: Float, r: Float,
    startAngle: Float, sweepAngle: Float, color: Color
) {
    val path = Path().apply {
        moveTo(cx, cy)
        arcTo(
            rect = Rect(cx - r, cy - r, cx + r, cy + r),
            startAngleDegrees = startAngle,
            sweepAngleDegrees = sweepAngle,
            forceMoveTo = false
        )
        close()
    }
    drawPath(path, color)
}
