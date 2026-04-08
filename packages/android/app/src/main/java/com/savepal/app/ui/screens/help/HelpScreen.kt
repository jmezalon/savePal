package com.savepal.app.ui.screens.help

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.unit.dp
import com.savepal.app.ui.components.SavePalCard
import com.savepal.app.ui.theme.*

private data class FaqItem(val question: String, val answer: String)

private val faqItems = listOf(
    FaqItem(
        "What is a ROSCA / Sousou?",
        "A ROSCA (Rotating Savings and Credit Association), also known as a Sousou, is a group savings method where members contribute a fixed amount each period. One member receives the full pot on a rotating basis until everyone has received a payout."
    ),
    FaqItem(
        "How do I create a group?",
        "Go to the Groups tab and tap the '+' button, then select 'Create Group'. Fill in the group name, contribution amount, frequency, payout method, and maximum number of members."
    ),
    FaqItem(
        "How are payments processed?",
        "Payments are processed securely through Stripe. You'll need to add a payment card through your Profile. When a payment is due, you can pay manually or enable auto-payment."
    ),
    FaqItem(
        "How do payouts work?",
        "When it's your turn to receive a payout, the collected contributions (minus processing fees) are transferred to your connected bank account. Make sure you've set up your bank account in your Profile."
    ),
    FaqItem(
        "What is Trust Score?",
        "Trust Score reflects your reliability as a group member. It increases when you verify your email (+20), phone (+20), and bank account (+20), and when you make payments on time. Late or missed payments decrease your score."
    ),
    FaqItem(
        "How do I set up my bank account for payouts?",
        "Go to Profile > Bank Account. You'll need to provide your bank routing number, account number, and identity verification details. This is required to receive payouts via Stripe Connect."
    ),
    FaqItem(
        "What happens if I miss a payment?",
        "Missing a payment affects your Trust Score and may result in a debt being recorded against your account. The debt may be deducted from future payouts. Always communicate with your group if you anticipate difficulties."
    ),
    FaqItem(
        "Is there a fee to create a group?",
        "A $10 creation fee may apply when creating a group. Group owners may use a waiver code to bypass this fee. Contact support if you believe you should have a waiver."
    ),
    FaqItem(
        "Why does the name on my card need to match my profile?",
        "To prevent fraud, the cardholder name on any payment method you add must match the first and last name on your SavePal profile. You cannot add a card that belongs to someone else. If the names do not match, the card will be rejected."
    ),
    FaqItem(
        "Can I change my name on my profile?",
        "No. Your first and last name are locked once your account is created and cannot be changed. This policy exists to protect the integrity of payment verification — since your card must match your profile name, allowing name changes could be used to bypass fraud protections. If you believe your name was entered incorrectly during registration, please contact support."
    ),
    FaqItem(
        "How many groups can I have at one time?",
        "You can have a maximum of 5 active groups at a time. This includes groups with a status of Pending (waiting to start) or Active (currently running). Once a group is completed or cancelled, it no longer counts toward your limit and you can create or join new groups."
    )
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HelpScreen(onBack: () -> Unit) {
    var expandedIndex by remember { mutableIntStateOf(-1) }
    val uriHandler = LocalUriHandler.current

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Help & FAQ") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            Text("Frequently Asked Questions", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(12.dp))

            faqItems.forEachIndexed { index, faq ->
                SavePalCard(modifier = Modifier.padding(vertical = 4.dp)) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                expandedIndex = if (expandedIndex == index) -1 else index
                            }
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                faq.question,
                                style = MaterialTheme.typography.titleSmall,
                                modifier = Modifier.weight(1f)
                            )
                            Icon(
                                if (expandedIndex == index) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                contentDescription = null,
                                tint = SavePalTextSecondary
                            )
                        }
                        AnimatedVisibility(visible = expandedIndex == index) {
                            Column {
                                Spacer(Modifier.height(8.dp))
                                Text(
                                    faq.answer,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = SavePalTextSecondary
                                )
                            }
                        }
                    }
                }
            }

            Spacer(Modifier.height(24.dp))
            Text("Legal", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(12.dp))

            SavePalCard(modifier = Modifier.padding(vertical = 4.dp)) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { uriHandler.openUri("https://save-pals.com/privacy") },
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.PrivacyTip, contentDescription = null, tint = SavePalBlue, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(12.dp))
                    Text("Privacy Policy", style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
                    Icon(Icons.Default.OpenInNew, contentDescription = null, tint = SavePalTextTertiary, modifier = Modifier.size(18.dp))
                }
            }
            SavePalCard(modifier = Modifier.padding(vertical = 4.dp)) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { uriHandler.openUri("https://save-pals.com/terms") },
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Description, contentDescription = null, tint = SavePalBlue, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(12.dp))
                    Text("Terms of Service", style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
                    Icon(Icons.Default.OpenInNew, contentDescription = null, tint = SavePalTextTertiary, modifier = Modifier.size(18.dp))
                }
            }

            Spacer(Modifier.height(32.dp))

            SavePalCard(modifier = Modifier.clickable { uriHandler.openUri("mailto:support@save-pals.com") }) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Default.Email, contentDescription = null, tint = SavePalBlue)
                    Spacer(Modifier.height(8.dp))
                    Text("Need more help?", style = MaterialTheme.typography.titleSmall)
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Contact us at support@save-pals.com",
                        style = MaterialTheme.typography.bodySmall,
                        color = SavePalBlue
                    )
                }
            }

            Spacer(Modifier.height(24.dp))
        }
    }
}
