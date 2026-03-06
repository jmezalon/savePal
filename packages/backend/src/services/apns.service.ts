import apn from '@parse/node-apn';
import prisma from '../utils/prisma.js';

class APNsService {
  private provider: apn.Provider | null = null;

  private getProvider(): apn.Provider | null {
    if (this.provider) return this.provider;

    const keyId = process.env.APNS_KEY_ID;
    const teamId = process.env.APNS_TEAM_ID;
    const keyPath = process.env.APNS_KEY_PATH;
    const keyContent = process.env.APNS_KEY;

    if (!keyId || !teamId || (!keyPath && !keyContent)) {
      console.warn('APNs not configured — push notifications disabled');
      return null;
    }

    // Support both file path (APNS_KEY_PATH) and inline key content (APNS_KEY)
    // APNS_KEY is preferred for cloud deployments (Render, Railway, etc.)
    // Replace literal \n with actual newlines (dotenv reads them as escaped)
    const key = keyContent ? keyContent.replace(/\\n/g, '\n') : keyPath!;

    this.provider = new apn.Provider({
      token: {
        key,
        keyId,
        teamId,
      },
      production: process.env.NODE_ENV === 'production',
    });

    return this.provider;
  }

  /**
   * Register a device token for a user
   */
  async registerDeviceToken(userId: string, token: string, platform: string = 'ios') {
    // Upsert: if token already exists, update the userId (device changed hands)
    return prisma.deviceToken.upsert({
      where: { token },
      update: { userId, platform, updatedAt: new Date() },
      create: { userId, token, platform },
    });
  }

  /**
   * Unregister a device token
   */
  async unregisterDeviceToken(token: string) {
    try {
      await prisma.deviceToken.delete({ where: { token } });
    } catch {
      // Token may not exist — that's fine
    }
  }

  /**
   * Unregister all device tokens for a user (on logout/delete)
   */
  async unregisterAllTokens(userId: string) {
    await prisma.deviceToken.deleteMany({ where: { userId } });
  }

  /**
   * Send push notification to a user's devices
   */
  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ) {
    const provider = this.getProvider();
    if (!provider) return;

    const bundleId = process.env.APNS_BUNDLE_ID || 'com.savepal.app';

    const deviceTokens = await prisma.deviceToken.findMany({
      where: { userId, platform: 'ios' },
      select: { token: true, id: true },
    });

    if (deviceTokens.length === 0) return;

    const note = new apn.Notification();
    note.alert = { title, body };
    note.sound = 'default';
    note.badge = 1;
    note.topic = bundleId;
    note.payload = data ? { custom: data } : {};

    const tokens = deviceTokens.map((dt) => dt.token);

    try {
      const result = await provider.send(note, tokens);

      // Clean up invalid tokens
      if (result.failed && result.failed.length > 0) {
        const invalidTokens = result.failed
          .filter((f: any) => f.response?.reason === 'BadDeviceToken' || f.response?.reason === 'Unregistered')
          .map((f: any) => f.device);

        if (invalidTokens.length > 0) {
          await prisma.deviceToken.deleteMany({
            where: { token: { in: invalidTokens } },
          });
        }
      }
    } catch (error) {
      console.error(`Failed to send push notification to user ${userId}:`, error);
    }
  }

  /**
   * Shutdown the provider connection
   */
  shutdown() {
    if (this.provider) {
      this.provider.shutdown();
      this.provider = null;
    }
  }
}

export default new APNsService();
