# Save-Pals Resend setup

The backend sends email through the Resend HTTPS API. No Google Workspace mailbox is required for outgoing email. All existing email templates use the same service, including verification, password resets, payment notifications and announcements.

1. Create a Resend Free account and add `save-pals.com` as a sending domain.
2. Add the exact DNS records shown in Resend at your DNS provider. Wait for the domain status to become Verified. Receiving email is optional; do not change root-domain incoming mail records just to configure sending.
3. Create a sending API key scoped to this domain. Save it directly in Render's backend environment as `RESEND_API_KEY`. Never commit or paste the key in chat.
4. In Render set `EMAIL_FROM=noreply@save-pals.com`, `FRONTEND_URL=https://save-pals.com` and `SUPPORT_EMAIL` to your confirmed personal contact address. This also sets Reply-To and email footer contact details.
5. Deploy the updated backend. Existing Render services need their live environment settings updated; editing the blueprint alone is not proof the live configuration changed.
6. Use a controlled test account to request a verification email and password reset. Confirm delivery in Resend and the recipient inbox, then verify the links complete the intended actions. Resend accepting a request is not proof of inbox delivery.

Remove obsolete EMAIL_HOST, EMAIL_PORT, EMAIL_USER and EMAIL_PASSWORD settings after switching. Leave NODE_ENV=production for live email sending; development mode intentionally suppresses email.

The free tier currently allows 3,000 messages monthly with a 100-per-day cap. All app emails count toward usage; keep paid overages disabled if the intention is to stay free. Check https://resend.com/pricing for current limits.

Local validation used mocked provider responses; no real emails were sent. Live delivery and signup completion remain unverified until the account, DNS and backend key are configured.
