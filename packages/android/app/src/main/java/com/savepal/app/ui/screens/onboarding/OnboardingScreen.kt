package com.savepal.app.ui.screens.onboarding

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.savepal.app.ui.screens.auth.AuthViewModel
import com.savepal.app.ui.theme.*
import kotlinx.coroutines.launch

private data class OnboardingPage(
    val icon: ImageVector,
    val title: String,
    val subtitle: String
)

private val pages = listOf(
    OnboardingPage(
        Icons.Default.Groups,
        "Save Together",
        "Join trusted savings circles with friends, family, or community members. Pool resources and reach your financial goals faster."
    ),
    OnboardingPage(
        Icons.Default.Autorenew,
        "How It Works",
        "Members contribute a fixed amount each period. One member receives the full pot on a rotating basis until everyone has received a payout."
    ),
    OnboardingPage(
        Icons.Default.Security,
        "Safe & Transparent",
        "Track every payment in real time. Verified members, secure transactions, and full transparency so you can save with confidence."
    )
)

@Composable
fun OnboardingScreen(
    onComplete: () -> Unit,
    authViewModel: AuthViewModel = hiltViewModel()
) {
    val pagerState = rememberPagerState(pageCount = { pages.size })
    val scope = rememberCoroutineScope()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .systemBarsPadding()
    ) {
        // Skip button
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalArrangement = Arrangement.End
        ) {
            TextButton(onClick = {
                authViewModel.setOnboarded()
                onComplete()
            }) {
                Text("Skip", color = SavePalTextSecondary)
            }
        }

        // Pages
        HorizontalPager(
            state = pagerState,
            modifier = Modifier.weight(1f)
        ) { page ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(120.dp)
                        .clip(CircleShape)
                        .background(SavePalBlueLight),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        pages[page].icon,
                        contentDescription = null,
                        modifier = Modifier.size(56.dp),
                        tint = SavePalBlue
                    )
                }
                Spacer(Modifier.height(40.dp))
                Text(
                    pages[page].title,
                    style = MaterialTheme.typography.headlineMedium,
                    textAlign = TextAlign.Center
                )
                Spacer(Modifier.height(16.dp))
                Text(
                    pages[page].subtitle,
                    style = MaterialTheme.typography.bodyLarge,
                    color = SavePalTextSecondary,
                    textAlign = TextAlign.Center
                )
            }
        }

        // Indicators
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center
        ) {
            repeat(pages.size) { index ->
                Box(
                    modifier = Modifier
                        .padding(4.dp)
                        .size(if (pagerState.currentPage == index) 24.dp else 8.dp, 8.dp)
                        .clip(CircleShape)
                        .background(
                            if (pagerState.currentPage == index) SavePalBlue
                            else SavePalBorder
                        )
                )
            }
        }

        Spacer(Modifier.height(32.dp))

        // Button
        Button(
            onClick = {
                if (pagerState.currentPage < pages.size - 1) {
                    scope.launch { pagerState.animateScrollToPage(pagerState.currentPage + 1) }
                } else {
                    authViewModel.setOnboarded()
                    onComplete()
                }
            },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 32.dp)
                .height(52.dp),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(containerColor = SavePalBlue)
        ) {
            Text(
                if (pagerState.currentPage == pages.size - 1) "Get Started" else "Next",
                fontWeight = FontWeight.SemiBold
            )
        }

        Spacer(Modifier.height(32.dp))
    }
}
