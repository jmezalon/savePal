/**
 * SMS Service for phone verification
 * Uses Twilio for sending SMS messages
 */

import twilio from 'twilio';

export class SMSService {
  private twilioClient: twilio.Twilio | null = null;

  constructor() {
    // Initialize Twilio client if credentials are provided
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (accountSid && authToken) {
      this.twilioClient = twilio(accountSid, authToken);
    }
  }

  /**
   * Send SMS verification code
   * @param phoneNumber - The phone number to send the code to (E.164 format)
   * @param code - The verification code
   */
  async sendVerificationCode(phoneNumber: string, code: string): Promise<void> {
    // In development, always log instead of sending real SMS
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n📱 [DEV] SMS suppressed:`);
      console.log(`   To: ${phoneNumber}`);
      console.log(`   Verification Code: ${code}`);
      console.log(`   ℹ️  Set NODE_ENV=production to send real SMS.\n`);
      return;
    }

    // Check if Twilio is configured
    if (!this.twilioClient) {
      throw new Error('SMS service not configured. Please add Twilio credentials to environment variables.');
    }

    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    if (!twilioPhone) {
      throw new Error('TWILIO_PHONE_NUMBER not configured');
    }

    try {
      // Send SMS via Twilio
      await this.twilioClient.messages.create({
        body: `Your SavePal verification code is: ${code}. This code expires in 10 minutes.`,
        from: twilioPhone,
        to: phoneNumber
      });

      console.log(`✓ SMS sent to ${phoneNumber}`);
    } catch (error) {
      console.error('Twilio error:', error);
      throw new Error('Failed to send SMS verification code');
    }
  }

  /**
   * Send a generic SMS message
   * @param phoneNumber - The phone number to send to (E.164 format)
   * @param message - The message body
   */
  async sendSMS(phoneNumber: string, message: string): Promise<void> {
    // In development, always log instead of sending real SMS
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n📱 [DEV] SMS suppressed:`);
      console.log(`   To: ${phoneNumber}`);
      console.log(`   Message: ${message}`);
      console.log(`   ℹ️  Set NODE_ENV=production to send real SMS.\n`);
      return;
    }

    if (!this.twilioClient) {
      throw new Error('SMS service not configured. Please add Twilio credentials to environment variables.');
    }

    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    if (!twilioPhone) {
      throw new Error('TWILIO_PHONE_NUMBER not configured');
    }

    await this.twilioClient.messages.create({
      body: message,
      from: twilioPhone,
      to: phoneNumber,
    });

    console.log(`✓ SMS sent to ${phoneNumber}`);
  }

  /**
   * Generate a random 6-digit verification code
   */
  generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Validate phone number format (basic validation)
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');

    // Check if it's a valid length (10-15 digits)
    return cleaned.length >= 10 && cleaned.length <= 15;
  }

  /**
   * Format phone number to E.164 format
   */
  formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');

    // If it doesn't start with country code, assume US (+1)
    if (!cleaned.startsWith('1') && cleaned.length === 10) {
      cleaned = '1' + cleaned;
    }

    return '+' + cleaned;
  }
}

export const smsService = new SMSService();
