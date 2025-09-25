import * as cron from 'node-cron';
import { AzureService } from './azureService.js';
import { MailService } from './mailService.js';
import { ExpirationNotification, NotificationThreshold } from './types.js';

export class Scheduler {
  private azureService: AzureService;
  private mailService: MailService;
  private notificationThresholds: NotificationThreshold[] = [15, 10, 5, 4, 3, 2, 1, 0];

  constructor() {
    this.azureService = new AzureService();
    this.mailService = new MailService();
  }

  private async checkSecretExpirations(): Promise<void> {
    console.log('Starting scheduled secret expiration check...');

    try {
      const appsWithExpiringSoon = await this.azureService.getApplicationsExpiringInDays(
        this.notificationThresholds
      );

      if (appsWithExpiringSoon.length === 0) {
        console.log('No applications with expiring or expired secrets found');
        return;
      }

      console.log(`Found ${appsWithExpiringSoon.length} applications with expiring or expired secrets`);

      const notifications: ExpirationNotification[] = appsWithExpiringSoon.map(app => ({
        appName: app.displayName,
        appId: app.appId,
        secrets: [
          ...app.secrets.map(secret => ({
            type: 'secret' as const,
            displayName: secret.displayName,
            endDateTime: secret.endDateTime,
            daysUntilExpiration: secret.daysUntilExpiration,
            isExpired: secret.isExpired
          })),
          ...app.certificates.map(cert => ({
            type: 'certificate' as const,
            displayName: cert.displayName,
            endDateTime: cert.endDateTime,
            daysUntilExpiration: cert.daysUntilExpiration,
            isExpired: cert.isExpired
          }))
        ]
      })).filter(notification => notification.secrets.length > 0);

      if (notifications.length > 0) {
        await this.mailService.sendNotification(notifications);
        console.log(`Sent notification email for ${notifications.length} applications`);

        const expiredCount = notifications.filter(n =>
          n.secrets.some(s => s.isExpired)
        ).length;

        const expiringSoonCount = notifications.length - expiredCount;

        console.log(`Summary: ${expiredCount} apps with expired secrets, ${expiringSoonCount} apps with secrets expiring soon`);
      }

    } catch (error) {
      console.error('Error during scheduled secret expiration check:', error);
    }
  }

  async runImmediateCheck(): Promise<void> {
    console.log('Running immediate secret expiration check...');
    await this.checkSecretExpirations();
  }

  startScheduler(): void {
    console.log('Starting secret expiration scheduler...');
    console.log('Scheduled to run daily at 09:00 AM');

    cron.schedule('0 9 * * *', async () => {
      await this.checkSecretExpirations();
    }, {
      timezone: 'Europe/Rome'
    });

    console.log('Scheduler started successfully');
  }

  async testServices(): Promise<void> {
    console.log('Testing Azure and Mail services...');

    try {
      console.log('Testing Azure Graph API connection...');
      const testApps = await this.azureService.getAllApplicationsWithSecrets();
      console.log(`✅ Azure service working - found ${testApps.length} applications`);

      console.log('Testing mail service connection...');
      const mailTestResult = await this.mailService.testConnection();
      if (mailTestResult) {
        console.log('✅ Mail service connection successful');
      } else {
        console.log('❌ Mail service connection failed');
      }

    } catch (error) {
      console.error('❌ Service test failed:', error);
      throw error;
    }
  }

  stopScheduler(): void {
    console.log('Stopping all scheduled tasks...');
    cron.getTasks().forEach((task, name) => {
      task.destroy();
      console.log(`Stopped task: ${name}`);
    });
  }
}