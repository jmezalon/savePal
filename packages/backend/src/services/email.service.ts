import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: parseInt(process.env.EMAIL_PORT || '587') === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  /**
   * Get email footer with support information
   */
  private getEmailFooter(): string {
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@save-pals.com';
    return `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
          Best regards,<br>
          The SavePal Team
        </p>
        <p style="margin: 0; color: #999; font-size: 12px;">
          Need help? Contact us at <a href="mailto:${supportEmail}" style="color: #2563eb; text-decoration: none;">${supportEmail}</a>
        </p>
      </div>
    `;
  }

  async sendEmail({ to, subject, html, text }: EmailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `SavePal <${process.env.EMAIL_FROM || 'noreply@save-pals.com'}>`,
        replyTo: process.env.SUPPORT_EMAIL || 'support@save-pals.com',
        to,
        subject,
        text,
        html,
      });
      console.log(`Email sent successfully to ${to}`);
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Send notification when a member joins a group
   */
  async sendMemberJoinedNotification(
    groupOwnerEmail: string,
    groupOwnerName: string,
    memberName: string,
    groupName: string
  ): Promise<void> {
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@save-pals.com';
    const subject = `New Member Joined: ${groupName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Member Joined Your Group</h2>
        <p>Hi ${groupOwnerName},</p>
        <p><strong>${memberName}</strong> has joined your savings group <strong>"${groupName}"</strong>.</p>
        <p>You can view your group details and manage members in your SavePal dashboard.</p>
        <div style="margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/dashboard"
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Dashboard
          </a>
        </div>
        ${this.getEmailFooter()}
      </div>
    `;
    const text = `Hi ${groupOwnerName},\n\n${memberName} has joined your savings group "${groupName}".\n\nView your dashboard: ${process.env.FRONTEND_URL}/dashboard\n\nBest regards,\nThe SavePal Team\n\nNeed help? Contact us at ${supportEmail}`;

    await this.sendEmail({ to: groupOwnerEmail, subject, html, text });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    name: string,
    resetToken: string
  ): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const subject = 'Reset Your SavePal Password';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="color: #2563eb; margin: 0 0 20px 0;">Reset Your Password</h2>
                    <p style="margin: 0 0 15px 0; color: #333; font-size: 16px;">Hi ${name},</p>
                    <p style="margin: 0 0 15px 0; color: #333; font-size: 16px;">You requested to reset your password for your SavePal account.</p>
                    <p style="margin: 0 0 30px 0; color: #333; font-size: 16px;">Click the button below to reset your password. This link will expire in 1 hour.</p>
                    <table role="presentation" style="margin: 0 0 30px 0;">
                      <tr>
                        <td style="border-radius: 6px; background-color: #2563eb;">
                          <a href="${resetUrl}" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 6px;">Reset Password</a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 0 0 15px 0; color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
                    <p style="margin: 0 0 30px 0; color: #2563eb; font-size: 14px; word-break: break-all;">${resetUrl}</p>
                    <p style="margin: 0 0 15px 0; color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
                    ${this.getEmailFooter()}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@save-pals.com';
    const text = `Hi ${name},\n\nYou requested to reset your password for your SavePal account.\n\nClick the link below to reset your password (expires in 1 hour):\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.\n\nBest regards,\nThe SavePal Team\n\nNeed help? Contact us at ${supportEmail}`;

    await this.sendEmail({ to: email, subject, html, text });
  }

  /**
   * Send email verification email
   */
  async sendEmailVerification(
    email: string,
    name: string,
    verificationToken: string
  ): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const subject = 'Verify Your SavePal Email';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="color: #2563eb; margin: 0 0 20px 0;">Welcome to SavePal!</h2>
                    <p style="margin: 0 0 15px 0; color: #333; font-size: 16px;">Hi ${name},</p>
                    <p style="margin: 0 0 15px 0; color: #333; font-size: 16px;">Thank you for joining SavePal - your trusted platform for group savings and ROSCAs.</p>
                    <p style="margin: 0 0 30px 0; color: #333; font-size: 16px;">Please verify your email address to get started.</p>
                    <table role="presentation" style="margin: 0 0 30px 0;">
                      <tr>
                        <td style="border-radius: 6px; background-color: #2563eb;">
                          <a href="${verificationUrl}" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 6px;">Verify Email</a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 0 0 15px 0; color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
                    <p style="margin: 0 0 30px 0; color: #2563eb; font-size: 14px; word-break: break-all;">${verificationUrl}</p>
                    <p style="margin: 0 0 15px 0; color: #666; font-size: 14px;">If you didn't create this account, you can safely ignore this email.</p>
                    ${this.getEmailFooter()}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@save-pals.com';
    const text = `Hi ${name},\n\nThank you for joining SavePal - your trusted platform for group savings and ROSCAs.\n\nPlease verify your email address by clicking the link below:\n${verificationUrl}\n\nIf you didn't create this account, you can safely ignore this email.\n\nBest regards,\nThe SavePal Team\n\nNeed help? Contact us at ${supportEmail}`;

    await this.sendEmail({ to: email, subject, html, text });
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@save-pals.com';
    const subject = 'Welcome to SavePal!';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to SavePal!</h2>
        <p>Hi ${name},</p>
        <p>Thank you for joining SavePal - your trusted platform for group savings and ROSCAs.</p>
        <p>Get started by creating your first savings group or joining an existing one.</p>
        <div style="margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/dashboard"
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Go to Dashboard
          </a>
        </div>
        ${this.getEmailFooter()}
      </div>
    `;
    const text = `Hi ${name},\n\nThank you for joining SavePal - your trusted platform for group savings and ROSCAs.\n\nGet started: ${process.env.FRONTEND_URL}/dashboard\n\nBest regards,\nThe SavePal Team\n\nNeed help? Contact us at ${supportEmail}`;

    await this.sendEmail({ to: email, subject, html, text });
  }
  /**
   * Send auto-payment scheduled email (day before due date)
   */
  async sendAutoPaymentScheduledEmail(
    email: string,
    name: string,
    groupName: string,
    amount: number,
    dueDate: Date
  ): Promise<void> {
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@save-pals.com';
    const formattedDate = dueDate.toLocaleDateString();
    const subject = `Auto-Payment Scheduled: $${amount} for ${groupName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Auto-Payment Scheduled</h2>
        <p>Hi ${name},</p>
        <p>This is a reminder that your card will be <strong>automatically charged $${amount}</strong> for <strong>"${groupName}"</strong> tomorrow (<strong>${formattedDate}</strong>).</p>
        <p>Please ensure sufficient funds are available on your saved payment method.</p>
        <div style="margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/dashboard"
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Dashboard
          </a>
        </div>
        ${this.getEmailFooter()}
      </div>
    `;
    const text = `Hi ${name},\n\nThis is a reminder that your card will be automatically charged $${amount} for "${groupName}" tomorrow (${formattedDate}).\n\nPlease ensure sufficient funds are available on your saved payment method.\n\nView your dashboard: ${process.env.FRONTEND_URL}/dashboard\n\nBest regards,\nThe SavePal Team\n\nNeed help? Contact us at ${supportEmail}`;

    await this.sendEmail({ to: email, subject, html, text });
  }

  /**
   * Send upcoming payment reminder email (2 days before due date)
   */
  async sendUpcomingPaymentReminderEmail(
    email: string,
    name: string,
    groupName: string,
    amount: number,
    dueDate: Date
  ): Promise<void> {
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@save-pals.com';
    const formattedDate = dueDate.toLocaleDateString();
    const subject = `Upcoming Payment in 2 Days - ${groupName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Upcoming Payment Reminder</h2>
        <p>Hi ${name},</p>
        <p>This is a friendly reminder that your card will be <strong>automatically charged $${amount}</strong> for <strong>"${groupName}"</strong> on <strong>${formattedDate}</strong> (in 2 days).</p>
        <p>Please ensure sufficient funds are available on your saved payment method to avoid any issues.</p>
        <div style="margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/dashboard"
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Dashboard
          </a>
        </div>
        ${this.getEmailFooter()}
      </div>
    `;
    const text = `Hi ${name},\n\nThis is a friendly reminder that your card will be automatically charged $${amount} for "${groupName}" on ${formattedDate} (in 2 days).\n\nPlease ensure sufficient funds are available on your saved payment method to avoid any issues.\n\nView your dashboard: ${process.env.FRONTEND_URL}/dashboard\n\nBest regards,\nThe SavePal Team\n\nNeed help? Contact us at ${supportEmail}`;

    await this.sendEmail({ to: email, subject, html, text });
  }

  /**
   * Send payment failure notification email to group owner/admin
   */
  async sendPaymentFailedAdminEmail(
    ownerEmail: string,
    ownerName: string,
    memberName: string,
    groupName: string,
    amount: number,
    failureReason?: string
  ): Promise<void> {
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@save-pals.com';
    const subject = `Payment Failed: ${memberName} in ${groupName}`;
    const reasonLine = failureReason
      ? `<p style="margin: 0 0 15px 0; color: #333; font-size: 16px;"><strong>Reason:</strong> ${failureReason}</p>`
      : '';
    const reasonText = failureReason ? `\nReason: ${failureReason}` : '';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Member Payment Failed</h2>
        <p>Hi ${ownerName},</p>
        <p style="margin: 0 0 15px 0; color: #333; font-size: 16px;">
          <strong>${memberName}</strong>'s payment of <strong>$${amount}</strong> for your group <strong>"${groupName}"</strong> has failed.
        </p>
        ${reasonLine}
        <p style="margin: 0 0 15px 0; color: #333; font-size: 16px;">
          Please follow up with this member to reconcile the missed payment.
        </p>
        <div style="margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/dashboard"
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Dashboard
          </a>
        </div>
        ${this.getEmailFooter()}
      </div>
    `;
    const text = `Hi ${ownerName},\n\n${memberName}'s payment of $${amount} for your group "${groupName}" has failed.${reasonText}\n\nPlease follow up with this member to reconcile the missed payment.\n\nView your dashboard: ${process.env.FRONTEND_URL}/dashboard\n\nBest regards,\nThe SavePal Team\n\nNeed help? Contact us at ${supportEmail}`;

    await this.sendEmail({ to: ownerEmail, subject, html, text });
  }

  /**
   * Send auto-payment processed email
   */
  async sendAutoPaymentProcessedEmail(
    email: string,
    name: string,
    groupName: string,
    amount: number
  ): Promise<void> {
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@save-pals.com';
    const subject = `Payment Processed: $${amount} for ${groupName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Auto-Payment Processed</h2>
        <p>Hi ${name},</p>
        <p>Your automatic payment of <strong>$${amount}</strong> for <strong>"${groupName}"</strong> has been successfully processed.</p>
        <p>You can view your payment details in your SavePal dashboard.</p>
        <div style="margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/dashboard"
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Dashboard
          </a>
        </div>
        ${this.getEmailFooter()}
      </div>
    `;
    const text = `Hi ${name},\n\nYour automatic payment of $${amount} for "${groupName}" has been successfully processed.\n\nView your dashboard: ${process.env.FRONTEND_URL}/dashboard\n\nBest regards,\nThe SavePal Team\n\nNeed help? Contact us at ${supportEmail}`;

    await this.sendEmail({ to: email, subject, html, text });
  }
  /**
   * Send bank account change security alert email
   */
  async sendBankAccountChangeEmail(
    email: string,
    name: string,
    action: 'added' | 'updated' | 'removed'
  ): Promise<void> {
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@save-pals.com';

    const subjects: Record<string, string> = {
      added: 'Security Alert: Bank Account Added',
      updated: 'Security Alert: Bank Account Updated',
      removed: 'Security Alert: Bank Account Removed',
    };

    const descriptions: Record<string, string> = {
      added: 'A bank account was successfully added to your SavePal account.',
      updated: 'Your bank account verification details were updated on your SavePal account.',
      removed: 'A bank account was removed from your SavePal account.',
    };

    const subject = subjects[action];
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Security Alert</h2>
        <p>Hi ${name},</p>
        <p>${descriptions[action]}</p>
        <p style="color: #dc2626; font-weight: bold;">If you did not make this change, please secure your account immediately by changing your password and contacting our support team.</p>
        <div style="margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/profile"
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Review Account Settings
          </a>
        </div>
        ${this.getEmailFooter()}
      </div>
    `;
    const text = `Hi ${name},\n\n${descriptions[action]}\n\nIf you did not make this change, please secure your account immediately by changing your password and contacting our support team.\n\nReview your account: ${process.env.FRONTEND_URL}/profile\n\nBest regards,\nThe SavePal Team\n\nNeed help? Contact us at ${supportEmail}`;

    await this.sendEmail({ to: email, subject, html, text });
  }
}

export default new EmailService();
