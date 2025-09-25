import * as cron from 'node-cron';
import { AzureService } from './services/azureService';
import { MailService } from './services/mailService';
import { ExpirationNotification, NotificationThreshold } from './types/types';
import { fastify } from '.';

export class Scheduler {
  private azureService: AzureService;
  private mailService: MailService;
  private notificationThresholds: NotificationThreshold[] = [15, 10, 5, 4, 3, 2, 1, 0];

  constructor() {
    this.azureService = new AzureService();
    this.mailService = new MailService();
  }

  private async checkSecretExpirations(): Promise<void> {
    fastify.log.info('Starting scheduled secret expiration check...');

    try {
      const appsWithExpiringSoon = await this.azureService.getApplicationsExpiringInDays(
        this.notificationThresholds
      );

      if (appsWithExpiringSoon.length === 0) {
        fastify.log.info('No applications with expiring or expired secrets found');
        return;
      }

      fastify.log.info(`Found ${appsWithExpiringSoon.length} applications with expiring or expired secrets`);

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
        fastify.log.info(`Sent notification email for ${notifications.length} applications`);

        const expiredCount = notifications.filter(n =>
          n.secrets.some(s => s.isExpired)
        ).length;

        const expiringSoonCount = notifications.length - expiredCount;

        fastify.log.info(`Summary: ${expiredCount} apps with expired secrets, ${expiringSoonCount} apps with secrets expiring soon`);
      }

    } catch (error : any) {
      fastify.log.error('Error during scheduled secret expiration check:', error);
    }
  }

  async runImmediateCheck(): Promise<void> {
    fastify.log.info('Running immediate secret expiration check...');
    await this.checkSecretExpirations();
  }

  startScheduler(): void {
    cron.schedule('0 9 * * *', async () => {
      await this.checkSecretExpirations();
    }, {
      timezone: 'Europe/Rome'
    });
  }

  async testServices(): Promise<void> {
    fastify.log.info('Testing Azure and Mail services...');

    try {
      fastify.log.info('Testing Azure Graph API connection...');
      const testApps = await this.azureService.getAllApplicationsWithSecrets();
      fastify.log.info(`✅ Azure service working - found ${testApps.length} applications`);

      fastify.log.info('Testing mail service connection...');
      const mailTestResult = await this.mailService.testConnection();
      if (mailTestResult) {
        fastify.log.info('✅ Mail service connection successful');
      } else {
        fastify.log.info('❌ Mail service connection failed');
      }

    } catch (error : any) {
      fastify.log.error('❌ Service test failed:', error);
      throw error;
    }
  }

  stopScheduler(): void {
    fastify.log.info('Stopping all scheduled tasks...');
    cron.getTasks().forEach((task, name) => {
      task.stop();
      fastify.log.info(`Stopped task: ${name}`);
    });
  }
}