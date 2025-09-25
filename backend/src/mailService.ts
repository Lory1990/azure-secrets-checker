import nodemailer from 'nodemailer';
import { EmailClient } from '@azure/communication-email';
import { MailConfig, ExpirationNotification } from './types.js';

export class MailService {
  private config: MailConfig;
  private smtpTransporter?: nodemailer.Transporter;
  private acsClient?: EmailClient;

  constructor() {
    const provider = process.env.MAIL_PROVIDER as 'SMTP' | 'ACS' || 'SMTP';
    const to = process.env.MAIL_TO!;
    const from = process.env.MAIL_FROM!;

    if (!to || !from) {
      throw new Error('Missing required mail configuration: MAIL_TO, MAIL_FROM');
    }

    this.config = {
      provider,
      to,
      from
    };

    if (provider === 'SMTP') {
      const host = process.env.SMTP_HOST!;
      const port = parseInt(process.env.SMTP_PORT || '587');
      const user = process.env.SMTP_USER!;
      const pass = process.env.SMTP_PASS!;

      if (!host || !user || !pass) {
        throw new Error('Missing required SMTP configuration: SMTP_HOST, SMTP_USER, SMTP_PASS');
      }

      this.config.smtp = { host, port, user, pass };
      this.initSMTP();
    } else if (provider === 'ACS') {
      const connectionString = process.env.ACS_CONNECTION_STRING!;

      if (!connectionString) {
        throw new Error('Missing required ACS configuration: ACS_CONNECTION_STRING');
      }

      this.config.acs = { connectionString };
      this.initACS();
    } else {
      throw new Error('Invalid MAIL_PROVIDER. Must be either SMTP or ACS');
    }
  }

  private initSMTP(): void {
    if (!this.config.smtp) return;

    this.smtpTransporter = nodemailer.createTransporter({
      host: this.config.smtp.host,
      port: this.config.smtp.port,
      secure: this.config.smtp.port === 465,
      auth: {
        user: this.config.smtp.user,
        pass: this.config.smtp.pass,
      },
    });
  }

  private initACS(): void {
    if (!this.config.acs) return;

    this.acsClient = new EmailClient(this.config.acs.connectionString);
  }

  private generateEmailContent(notifications: ExpirationNotification[]): { subject: string; html: string; text: string } {
    const now = new Date().toLocaleString();
    const totalApps = notifications.length;
    const expiredApps = notifications.filter(n =>
      n.secrets.some(s => s.isExpired)
    ).length;

    const subject = `Azure Secrets Expiration Alert - ${totalApps} application(s) require attention`;

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Azure Secrets Expiration Alert</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background-color: #0078d4; color: white; padding: 20px; border-radius: 5px; }
          .summary { background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .app-block { margin: 20px 0; padding: 15px; border: 1px solid #e0e0e0; border-radius: 5px; }
          .app-title { font-size: 18px; font-weight: bold; color: #0078d4; margin-bottom: 10px; }
          .secret-item { margin: 10px 0; padding: 10px; background-color: #f8f9fa; border-radius: 3px; }
          .expired { background-color: #fff5f5; border-left: 4px solid #dc3545; }
          .warning { background-color: #fff8e1; border-left: 4px solid #ffc107; }
          .footer { margin-top: 30px; padding: 15px; background-color: #f8f9fa; border-radius: 5px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔐 Azure Secrets Expiration Alert</h1>
          <p>Generated on: ${now}</p>
        </div>

        <div class="summary">
          <h2>Summary</h2>
          <ul>
            <li><strong>Total Applications:</strong> ${totalApps}</li>
            <li><strong>Applications with Expired Secrets:</strong> ${expiredApps}</li>
            <li><strong>Applications with Expiring Soon:</strong> ${totalApps - expiredApps}</li>
          </ul>
        </div>`;

    let text = `AZURE SECRETS EXPIRATION ALERT\n`;
    text += `Generated on: ${now}\n\n`;
    text += `SUMMARY\n`;
    text += `- Total Applications: ${totalApps}\n`;
    text += `- Applications with Expired Secrets: ${expiredApps}\n`;
    text += `- Applications with Expiring Soon: ${totalApps - expiredApps}\n\n`;

    notifications.forEach(notification => {
      html += `
        <div class="app-block">
          <div class="app-title">${notification.appName}</div>
          <p><strong>App ID:</strong> ${notification.appId}</p>`;

      text += `APPLICATION: ${notification.appName}\n`;
      text += `App ID: ${notification.appId}\n`;

      notification.secrets.forEach(secret => {
        const cssClass = secret.isExpired ? 'expired' : 'warning';
        const status = secret.isExpired ? '⚠️ EXPIRED' : `⏰ Expires in ${secret.daysUntilExpiration} days`;
        const displayName = secret.displayName || 'Unnamed';

        html += `
          <div class="secret-item ${cssClass}">
            <strong>${status}</strong><br>
            Type: ${secret.type.toUpperCase()}<br>
            Name: ${displayName}<br>
            Expiration: ${new Date(secret.endDateTime).toLocaleString()}
          </div>`;

        text += `  - ${status}\n`;
        text += `    Type: ${secret.type.toUpperCase()}\n`;
        text += `    Name: ${displayName}\n`;
        text += `    Expiration: ${new Date(secret.endDateTime).toLocaleString()}\n`;
      });

      html += `</div>`;
      text += `\n`;
    });

    html += `
        <div class="footer">
          <p>This is an automated notification from Azure Secrets Checker.</p>
          <p>Please take immediate action to renew expired secrets and plan for upcoming expirations.</p>
        </div>
      </body>
      </html>`;

    text += `\nThis is an automated notification from Azure Secrets Checker.\n`;
    text += `Please take immediate action to renew expired secrets and plan for upcoming expirations.\n`;

    return { subject, html, text };
  }

  async sendNotification(notifications: ExpirationNotification[]): Promise<void> {
    if (notifications.length === 0) {
      console.log('No notifications to send');
      return;
    }

    const { subject, html, text } = this.generateEmailContent(notifications);

    try {
      if (this.config.provider === 'SMTP') {
        await this.sendViaSMTP(subject, html, text);
      } else {
        await this.sendViaACS(subject, html, text);
      }

      console.log(`Successfully sent notification email for ${notifications.length} applications`);
    } catch (error) {
      console.error('Failed to send notification email:', error);
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

    const emailMessage = {
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
      if (this.config.provider === 'SMTP' && this.smtpTransporter) {
        await this.smtpTransporter.verify();
        console.log('SMTP connection test successful');
        return true;
      } else if (this.config.provider === 'ACS' && this.acsClient) {
        console.log('ACS client initialized successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Mail service connection test failed:', error);
      return false;
    }
  }
}