import nodemailer from 'nodemailer';
import { EmailClient, EmailMessage } from '@azure/communication-email';
import { ClientSecretCredential } from '@azure/identity';
import pug from 'pug';
import path from 'path';
import { MailConfig, ExpirationNotification } from '../types/types';
import { fastify } from '../index';

export class MailService {
  private config: MailConfig;
  private smtpTransporter?: nodemailer.Transporter;
  private acsClient?: EmailClient;
  private templatePath: string;

  constructor() {
    const to = process.env.MAIL_TO!;
    const from = process.env.MAIL_FROM!;

    if (!to || !from) {
      throw new Error('Missing required mail configuration: MAIL_TO, MAIL_FROM');
    }

    this.config = {
      to,
      from,
    };

    this.templatePath = path.join(__dirname, '../templates/email-notification.pug');

    if (process.env.SMTP_HOST) {
      const host = process.env.SMTP_HOST!;
      const port = parseInt(process.env.SMTP_PORT || '587');
      const user = process.env.SMTP_USERNAME!;
      const pass = process.env.SMTP_PASSWORD!;
      const secure = process.env.SMTP_SECURE === 'true';

      if (!host || !user || !pass) {
        throw new Error('Missing required SMTP configuration: SMTP_HOST, SMTP_USER, SMTP_PASS');
      }

      this.config.smtp = { host, port, user, pass, secure };
      this.initSMTP();
    } else if (process.env.ACS_ENDPOINT) {
      this.config.acs = { endpoint: process.env.ACS_ENDPOINT, key: process.env.ACS_KEY };
      this.initACS();
    } else {
      throw new Error('Invalid MAIL_PROVIDER. Must specify either SMTP_HOST or ACS_ENDPOINT');
    }
  }

  private initSMTP(): void {
    if (!this.config.smtp) return;

    this.smtpTransporter = nodemailer.createTransport({
      host: this.config.smtp.host,
      port: this.config.smtp.port,
      secure: this.config.smtp.secure,
      auth: {
        user: this.config.smtp.user,
        pass: this.config.smtp.pass,
      },
    });
  }

  private initACS(): void {
    if (!this.config.acs) return;
    if(this.config.acs.key){
      this.acsClient = new EmailClient(`endpoint=${this.config.acs.endpoint};accesskey=${this.config.acs.key}`);
    }else{
      this.acsClient = new EmailClient(this.config.acs.endpoint, new ClientSecretCredential(process.env.TENANT_ID!, process.env.CLIENT_ID!, process.env.CLIENT_SECRET!));
    }
  }

  private generateEmailContent(notifications: ExpirationNotification[]): { subject: string; html: string; text: string } {
    const now = new Date().toLocaleString();
    const totalApps = notifications.length;
    const expiredApps = notifications.filter(n =>
      n.secrets.some(s => s.isExpired)
    ).length;

    const subject = `Azure Secrets Expiration Alert - ${totalApps} application(s) require attention`;

    const html = pug.renderFile(this.templatePath, {
      now,
      totalApps,
      expiredApps,
      notifications
    });

    let text = `AZURE SECRETS EXPIRATION ALERT\n`;
    text += `Generated on: ${now}\n\n`;
    text += `SUMMARY\n`;
    text += `- Total Applications: ${totalApps}\n`;
    text += `- Applications with Expired Secrets: ${expiredApps}\n`;
    text += `- Applications with Expiring Soon: ${totalApps - expiredApps}\n\n`;

    notifications.forEach(notification => {
      text += `APPLICATION: ${notification.appName}\n`;
      text += `App ID: ${notification.appId}\n`;

      notification.secrets.forEach(secret => {
        const status = secret.isExpired ? '⚠️ EXPIRED' : `⏰ Expires in ${secret.daysUntilExpiration} days`;
        const displayName = secret.displayName || 'Unnamed';

        text += `  - ${status}\n`;
        text += `    Type: ${secret.type.toUpperCase()}\n`;
        text += `    Name: ${displayName}\n`;
        text += `    Expiration: ${new Date(secret.endDateTime).toLocaleString()}\n`;
      });

      text += `\n`;
    });

    text += `\nThis is an automated notification from Azure Secrets Checker.\n`;
    text += `Please take immediate action to renew expired secrets and plan for upcoming expirations.\n`;

    return { subject, html, text };
  }

  async sendNotification(notifications: ExpirationNotification[]): Promise<void> {
    if (notifications.length === 0) {
      fastify.log.info('No notifications to send');
      return;
    }

    const { subject, html, text } = this.generateEmailContent(notifications);

    try {
      if (this.config.smtp) {
        await this.sendViaSMTP(subject, html, text);
      } else if(this.config.acs) {
        await this.sendViaACS(subject, html, text);
      } else{
        throw new Error('No mail provider configured');
      }

      fastify.log.info(`Successfully sent notification email for ${notifications.length} applications`);
    } catch (error : any) {
      fastify.log.info('Failed to send notification email:', error);
      throw error;
    }
  }

  private async sendViaSMTP(subject: string, html: string, text: string): Promise<void> {
    if (!this.smtpTransporter) {
      throw new Error('SMTP transporter not initialized');
    }

    await this.smtpTransporter.sendMail({
      from: this.config.from,
      to: this.config.to,
      subject,
      text,
      html,
    });
  }

  private async sendViaACS(subject: string, html: string, text: string): Promise<void> {
    if (!this.acsClient) {
      throw new Error('ACS client not initialized');
    }

    const emailMessage : EmailMessage = {
      senderAddress: this.config.from,
      content: {
        subject,
        plainText: text,
        html,
      },
      recipients: {
        to: [{ address: this.config.to }],
      },
    };

    const poller = await this.acsClient.beginSend(emailMessage);
    await poller.pollUntilDone();
  }

  async testConnection(): Promise<boolean> {
    try {
      if (this.smtpTransporter) {
        await this.smtpTransporter.verify();
        fastify.log.info('SMTP connection test successful');
        return true;
      } else if (this.acsClient) {
        fastify.log.info('ACS client initialized successfully');
        return true;
      }
      return false;
    } catch (error : any) {
      fastify.log.error('Mail service connection test failed:', error);
      return false;
    }
  }
}