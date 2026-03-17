import { User } from '@prisma/client';
import prisma from '../utils/prisma.js';
import { hashPassword, comparePassword, generateToken } from '../utils/auth.js';
import emailService from './email.service.js';
import { smsService } from './smsService.js';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import jwksClient from 'jwks-rsa';
import jwt from 'jsonwebtoken';

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  token: string;
}

class AuthService {
  /**
   * Register a new user
   */
  async register(data: RegisterInput): Promise<AuthResponse> {
    // Normalize email to lowercase
    const normalizedEmail = data.email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // Create user
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,
        emailVerificationToken,
        emailVerified: false,
      },
    });

    // Send verification email
    try {
      await emailService.sendEmailVerification(
        user.email,
        user.firstName,
        emailVerificationToken
      );
    } catch (error) {
      console.error('Failed to send verification email:', error);
      // Don't throw error - user was created successfully
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  }

  /**
   * Login user
   */
  async login(data: LoginInput): Promise<AuthResponse> {
    // Normalize email to lowercase
    const normalizedEmail = data.email.toLowerCase().trim();

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if user has a password (Google-only users won't)
    if (!user.password) {
      throw new Error('This account uses Google sign-in. Please sign in with Google.');
    }

    // Verify password
    const isPasswordValid = await comparePassword(data.password, user.password);

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  }

  /**
   * Authenticate with Google
   * Verifies the Google ID token and either logs in an existing user or creates a new one.
   */
  async googleAuth(credential: string): Promise<AuthResponse> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error('Google authentication is not configured');
    }

    // Accept both web and iOS client IDs
    const audiences = [clientId, process.env.GOOGLE_IOS_CLIENT_ID].filter(Boolean) as string[];
    const client = new OAuth2Client(clientId);

    // Verify the Google ID token
    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: audiences,
      });
      payload = ticket.getPayload();
    } catch {
      throw new Error('Invalid Google credential');
    }

    if (!payload || !payload.email) {
      throw new Error('Invalid Google credential');
    }

    const { sub: googleId, email, given_name, family_name, email_verified } = payload;

    const normalizedEmail = email!.toLowerCase().trim();

    // Check if a user with this Google ID already exists
    let user = await prisma.user.findUnique({
      where: { googleId: googleId },
    });

    if (!user) {
      // Check if a user with this email already exists (registered via email/password)
      user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (user) {
        // Link Google account to existing user
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: googleId,
            emailVerified: user.emailVerified || email_verified || false,
          },
        });
      } else {
        // Create a new user from Google data
        user = await prisma.user.create({
          data: {
            email: normalizedEmail,
            googleId: googleId,
            firstName: given_name || 'User',
            lastName: family_name || '',
            emailVerified: email_verified || false,
            trustScore: email_verified ? 20 : 0,
          },
        });
      }
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  }

  /**
   * Authenticate with Apple
   * Verifies the Apple identity token and either logs in an existing user or creates a new one.
   */
  async appleAuth(identityToken: string, fullName?: { firstName?: string; lastName?: string }): Promise<AuthResponse> {
    // Verify Apple identity token using JWKS
    const appleJwksClient = jwksClient({
      jwksUri: 'https://appleid.apple.com/auth/keys',
      cache: true,
      cacheMaxAge: 86400000, // 24 hours
    });

    let decoded: any;
    try {
      // Decode header to get kid
      const header = JSON.parse(Buffer.from(identityToken.split('.')[0], 'base64').toString());
      const key = await appleJwksClient.getSigningKey(header.kid);
      const publicKey = key.getPublicKey();

      // Build valid audience list: iOS bundle ID + web Services ID
      const validAudiences = [
        process.env.APNS_BUNDLE_ID || 'com.savepal.app',
        process.env.APPLE_WEB_SERVICE_ID,
      ].filter(Boolean) as string[];

      decoded = jwt.verify(identityToken, publicKey, {
        algorithms: ['RS256'],
        issuer: 'https://appleid.apple.com',
        audience: validAudiences as [string, ...string[]],
      });
    } catch {
      throw new Error('Invalid Apple credential');
    }

    const appleId = decoded.sub as string;
    const email = decoded.email as string | undefined;
    const emailVerified = decoded.email_verified === 'true' || decoded.email_verified === true;

    if (!appleId) {
      throw new Error('Invalid Apple credential');
    }

    // Check if a user with this Apple ID already exists
    let user = await prisma.user.findUnique({
      where: { appleId },
    });

    if (!user && email) {
      const normalizedEmail = email.toLowerCase().trim();

      // Check if a user with this email already exists
      user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (user) {
        // Link Apple account to existing user
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            appleId,
            emailVerified: user.emailVerified || emailVerified,
          },
        });
      } else {
        // Create a new user from Apple data
        // Apple only sends the name on the very first authorization
        user = await prisma.user.create({
          data: {
            email: normalizedEmail,
            appleId,
            firstName: fullName?.firstName || 'User',
            lastName: fullName?.lastName || '',
            emailVerified,
            trustScore: emailVerified ? 20 : 0,
          },
        });
      }
    } else if (!user) {
      // No email from Apple and no existing user — cannot create account
      throw new Error('Unable to create account. No email provided by Apple.');
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<Omit<User, 'password'> | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return null;
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Get user profile with stats
   */
  async getUserProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: { isActive: true },
          include: {
            group: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const { password: _, ...userWithoutPassword } = user;

    // Calculate stats - only count groups that are not completed or cancelled
    const activeGroups = user.memberships.filter(
      (m) => m.group.status !== 'COMPLETED' && m.group.status !== 'CANCELLED'
    ).length;
    const completedGroups = await prisma.membership.count({
      where: {
        userId: userId,
        isActive: false,
        group: {
          status: 'COMPLETED',
        },
      },
    });

    // Calculate total saved (total payouts received)
    const payouts = await prisma.payout.aggregate({
      where: {
        recipientId: userId,
        status: 'COMPLETED',
      },
      _sum: {
        netAmount: true,
      },
    });

    const totalSaved = payouts._sum.netAmount || 0;

    return {
      ...userWithoutPassword,
      stats: {
        totalSaved,
        activeGroups,
        completedGroups,
      },
    };
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
  }): Promise<Omit<User, 'password'>> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.phoneNumber !== undefined && { phoneNumber: data.phoneNumber }),
      },
    });

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(userId: string, preferences: {
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    pushNotifications?: boolean;
  }): Promise<Omit<User, 'password'>> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(preferences.emailNotifications !== undefined && { emailNotifications: preferences.emailNotifications }),
        ...(preferences.smsNotifications !== undefined && { smsNotifications: preferences.smsNotifications }),
        ...(preferences.pushNotifications !== undefined && { pushNotifications: preferences.pushNotifications }),
      },
    });

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if user has a password (Google-only users won't)
    if (!user.password) {
      throw new Error('This account uses Google sign-in and does not have a password set.');
    }

    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // Don't reveal if user exists for security
    if (!user) {
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Save reset token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Send reset email
    try {
      await emailService.sendPasswordResetEmail(
        user.email,
        user.firstName,
        resetToken
      );
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Find user by reset token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gte: new Date(), // Token must not be expired
        },
      },
    });

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<void> {
    // Find user by verification token
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
      },
    });

    if (!user) {
      throw new Error('Invalid verification token');
    }

    if (user.emailVerified) {
      throw new Error('Email already verified');
    }

    // Update user to mark email as verified and increase trust score
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        trustScore: {
          increment: 20, // Add 20 points for email verification
        },
      },
    });
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<void> {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      // Don't reveal if user exists
      return;
    }

    if (user.emailVerified) {
      throw new Error('Email already verified');
    }

    // Generate new verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // Update user with new token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken,
      },
    });

    // Send verification email
    try {
      await emailService.sendEmailVerification(
        user.email,
        user.firstName,
        emailVerificationToken
      );
    } catch (error) {
      console.error('Failed to send verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Send phone verification code
   */
  async sendPhoneVerification(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.phoneNumber) {
      throw new Error('No phone number on file. Please add a phone number to your profile first.');
    }

    if (user.phoneVerified) {
      throw new Error('Phone number is already verified');
    }

    // Validate phone number format
    if (!smsService.validatePhoneNumber(user.phoneNumber)) {
      throw new Error('Invalid phone number format');
    }

    // Generate 6-digit verification code
    const verificationCode = smsService.generateVerificationCode();

    // Set expiry to 10 minutes from now
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 10);

    // Store verification code in database
    await prisma.user.update({
      where: { id: userId },
      data: {
        phoneVerificationToken: verificationCode,
        phoneVerificationExpiry: expiry,
      },
    });

    // Send SMS with verification code
    try {
      const formattedPhone = smsService.formatPhoneNumber(user.phoneNumber);
      await smsService.sendVerificationCode(formattedPhone, verificationCode);
    } catch (error) {
      console.error('Failed to send verification SMS:', error);
      throw new Error('Failed to send verification code');
    }
  }

  /**
   * Delete user account
   * Only allowed if user has no active/pending groups
   */
  async deleteAccount(userId: string): Promise<void> {
    const memberships = await prisma.membership.findMany({
      where: { userId },
      include: { group: true },
    });

    const activeGroups = memberships.filter(
      (m) => m.group.status === 'PENDING' || m.group.status === 'ACTIVE'
    );

    if (activeGroups.length > 0) {
      const groupNames = activeGroups.map((m) => m.group.name).join(', ');
      throw new Error(
        `Cannot delete account while you are in active groups: ${groupNames}. Please wait for them to complete or leave first.`
      );
    }

    await prisma.user.delete({ where: { id: userId } });
  }

  /**
   * Verify phone with code
   */
  async verifyPhone(userId: string, code: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.phoneVerified) {
      throw new Error('Phone number is already verified');
    }

    if (!user.phoneVerificationToken || !user.phoneVerificationExpiry) {
      throw new Error('No verification code found. Please request a new code.');
    }

    // Check if code has expired
    if (new Date() > user.phoneVerificationExpiry) {
      throw new Error('Verification code has expired. Please request a new code.');
    }

    // Check if code matches
    if (user.phoneVerificationToken !== code) {
      throw new Error('Invalid verification code');
    }

    // Mark phone as verified and clear verification fields
    await prisma.user.update({
      where: { id: userId },
      data: {
        phoneVerified: true,
        phoneVerificationToken: null,
        phoneVerificationExpiry: null,
        trustScore: { increment: 10 }, // Increase trust score for verifying phone
      },
    });
  }
}

export default new AuthService();
