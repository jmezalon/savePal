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
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async sendEmail({ to, subject, html, text }: EmailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `SavePal <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
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
        <p style="color: #666; font-size: 14px;">
          Best regards,<br>
          The SavePal Team
        </p>
      </div>
    `;
    const text = `Hi ${groupOwnerName},\n\n${memberName} has joined your savings group "${groupName}".\n\nView your dashboard: ${process.env.FRONTEND_URL}/dashboard\n\nBest regards,\nThe SavePal Team`;

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
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Reset Your Password</h2>
        <p>Hi ${name},</p>
        <p>You requested to reset your password for your SavePal account.</p>
        <p>Click the button below to reset your password. This link will expire in 1 hour.</p>
        <div style="margin: 30px 0;">
          <a href="${resetUrl}"
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #666;">If you didn't request this, you can safely ignore this email.</p>
        <p style="color: #666; font-size: 14px;">
          Best regards,<br>
          The SavePal Team
        </p>
      </div>
    `;
    const text = `Hi ${name},\n\nYou requested to reset your password for your SavePal account.\n\nClick the link below to reset your password (expires in 1 hour):\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.\n\nBest regards,\nThe SavePal Team`;

    await this.sendEmail({ to: email, subject, html, text });
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
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
        <p style="color: #666; font-size: 14px;">
          Best regards,<br>
          The SavePal Team
        </p>
      </div>
    `;
    const text = `Hi ${name},\n\nThank you for joining SavePal - your trusted platform for group savings and ROSCAs.\n\nGet started: ${process.env.FRONTEND_URL}/dashboard\n\nBest regards,\nThe SavePal Team`;

    await this.sendEmail({ to: email, subject, html, text });
  }
}

export default new EmailService();
