import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class FCMService {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private projectId: string | null = null;
  private serviceAccountEmail: string | null = null;
  private privateKey: string | null = null;

  private async initialize(): Promise<boolean> {
    if (!process.env.FCM_PROJECT_ID || !process.env.FCM_SERVICE_ACCOUNT_EMAIL || !process.env.FCM_PRIVATE_KEY) {
      return false;
    }
    this.projectId = process.env.FCM_PROJECT_ID;
    this.serviceAccountEmail = process.env.FCM_SERVICE_ACCOUNT_EMAIL;
    this.privateKey = process.env.FCM_PRIVATE_KEY.replace(/\\n/g, '\n');
    return true;
  }

  private async getAccessToken(): Promise<string | null> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!this.privateKey || !this.serviceAccountEmail) {
      const initialized = await this.initialize();
      if (!initialized) return null;
    }

    try {
      const jwt = await this.createJWT();
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt,
        }),
      });

      const data = await response.json() as { access_token: string; expires_in: number };
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
      return this.accessToken;
    } catch (err) {
      console.error('FCM: Failed to get access token:', err);
      return null;
    }
  }

  private async createJWT(): Promise<string> {
    const crypto = await import('crypto');
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const payload = Buffer.from(JSON.stringify({
      iss: this.serviceAccountEmail,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })).toString('base64url');

    const signInput = `${header}.${payload}`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signInput);
    const signature = sign.sign(this.privateKey!, 'base64url');

    return `${signInput}.${signature}`;
  }

  async registerDeviceToken(userId: string, token: string): Promise<void> {
    await prisma.deviceToken.upsert({
      where: { token },
      update: { userId, platform: 'android', updatedAt: new Date() },
      create: { userId, token, platform: 'android' },
    });
  }

  async unregisterDeviceToken(token: string): Promise<void> {
    await prisma.deviceToken.deleteMany({
      where: { token, platform: 'android' },
    });
  }

  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<void> {
    const accessToken = await this.getAccessToken();
    if (!accessToken || !this.projectId) {
      return;
    }

    const deviceTokens = await prisma.deviceToken.findMany({
      where: { userId, platform: 'android' },
    });

    if (deviceTokens.length === 0) return;

    const url = `https://fcm.googleapis.com/v1/projects/${this.projectId}/messages:send`;

    for (const dt of deviceTokens) {
      try {
        const message: any = {
          message: {
            token: dt.token,
            notification: { title, body },
            android: {
              priority: 'high' as const,
              notification: {
                channel_id: 'savepal_notifications',
                sound: 'default',
              },
            },
          },
        };

        if (data) {
          message.message.data = data;
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
        });

        if (!response.ok) {
          const errorData = await response.json() as { error?: { details?: { errorCode?: string }[] } };
          const errorCode = errorData?.error?.details?.[0]?.errorCode;
          if (errorCode === 'UNREGISTERED' || errorCode === 'INVALID_ARGUMENT') {
            await prisma.deviceToken.delete({ where: { id: dt.id } }).catch(() => {});
            console.log(`FCM: Removed invalid token for user ${userId}`);
          } else {
            console.error('FCM: Send failed:', errorData);
          }
        }
      } catch (err) {
        console.error(`FCM: Error sending to token ${dt.token}:`, err);
      }
    }
  }
}

export default new FCMService();
