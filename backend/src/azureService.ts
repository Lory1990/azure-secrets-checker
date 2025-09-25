import axios from 'axios';
import dayjs from 'dayjs';
import {
  AzureTokenResponse,
  ServicePrincipal,
  Application,
  ApplicationWithSecrets,
  SecretInfo,
  CertificateInfo,
  PasswordCredential,
  KeyCredential
} from './types.js';

export class AzureService {
  private tenantId: string;
  private clientId: string;
  private clientSecret: string;
  private accessToken?: string;
  private tokenExpiry?: Date;

  constructor() {
    this.tenantId = process.env.TENANT_ID!;
    this.clientId = process.env.CLIENT_ID!;
    this.clientSecret = process.env.CLIENT_SECRET!;

    if (!this.tenantId || !this.clientId || !this.clientSecret) {
      throw new Error('Missing required Azure configuration: TENANT_ID, CLIENT_ID, CLIENT_SECRET');
    }
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    const tokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams();
    params.append('client_id', this.clientId);
    params.append('client_secret', this.clientSecret);
    params.append('scope', 'https://graph.microsoft.com/.default');
    params.append('grant_type', 'client_credentials');

    try {
      const response = await axios.post<AzureTokenResponse>(tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000) - 60000);

      return this.accessToken;
    } catch (error) {
      console.error('Failed to get Azure access token:', error);
      throw new Error('Failed to authenticate with Azure');
    }
  }

  private async makeGraphRequest<T>(url: string): Promise<T> {
    const token = await this.getAccessToken();

    try {
      const response = await axios.get<T>(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      console.error(`Failed to make Graph API request to ${url}:`, error);
      throw new Error(`Graph API request failed: ${url}`);
    }
  }

  private async getAllPagedResults<T>(url: string, valueKey: string = 'value'): Promise<T[]> {
    let results: T[] = [];
    let nextUrl: string | null = url;

    while (nextUrl) {
      const response = await this.makeGraphRequest<any>(nextUrl);
      results = results.concat(response[valueKey] || []);
      nextUrl = response['@odata.nextLink'] || null;
    }

    return results;
  }

  async getServicePrincipals(): Promise<ServicePrincipal[]> {
    const url = 'https://graph.microsoft.com/v1.0/servicePrincipals?$select=id,appId,displayName,passwordCredentials,keyCredentials';
    return this.getAllPagedResults<ServicePrincipal>(url);
  }

  async getApplications(): Promise<Application[]> {
    const url = 'https://graph.microsoft.com/v1.0/applications?$select=id,appId,displayName,passwordCredentials,keyCredentials';
    return this.getAllPagedResults<Application>(url);
  }

  private calculateDaysUntilExpiration(endDateTime: string): number {
    const expiryDate = dayjs(endDateTime);
    const now = dayjs();
    return Math.ceil(expiryDate.diff(now, 'day', true));
  }

  private processPasswordCredentials(
    credentials: PasswordCredential[],
    source: 'servicePrincipal' | 'application'
  ): SecretInfo[] {
    return credentials.map(cred => ({
      keyId: cred.keyId,
      displayName: cred.displayName,
      endDateTime: cred.endDateTime,
      daysUntilExpiration: this.calculateDaysUntilExpiration(cred.endDateTime),
      isExpired: this.calculateDaysUntilExpiration(cred.endDateTime) <= 0,
      source
    }));
  }

  private processKeyCredentials(
    credentials: KeyCredential[],
    source: 'servicePrincipal' | 'application'
  ): CertificateInfo[] {
    return credentials.map(cred => ({
      keyId: cred.keyId,
      displayName: cred.displayName,
      endDateTime: cred.endDateTime,
      daysUntilExpiration: this.calculateDaysUntilExpiration(cred.endDateTime),
      isExpired: this.calculateDaysUntilExpiration(cred.endDateTime) <= 0,
      type: cred.type,
      usage: cred.usage,
      source
    }));
  }

  async getAllApplicationsWithSecrets(): Promise<ApplicationWithSecrets[]> {
    console.log('Fetching service principals and applications...');

    const [servicePrincipals, applications] = await Promise.all([
      this.getServicePrincipals(),
      this.getApplications()
    ]);

    console.log(`Found ${servicePrincipals.length} service principals and ${applications.length} applications`);

    const appMap = new Map<string, ApplicationWithSecrets>();

    servicePrincipals.forEach(sp => {
      if (!appMap.has(sp.appId)) {
        appMap.set(sp.appId, {
          id: sp.id,
          appId: sp.appId,
          displayName: sp.displayName,
          secrets: [],
          certificates: []
        });
      }

      const app = appMap.get(sp.appId)!;
      app.secrets.push(...this.processPasswordCredentials(sp.passwordCredentials, 'servicePrincipal'));
      app.certificates.push(...this.processKeyCredentials(sp.keyCredentials, 'servicePrincipal'));
    });

    applications.forEach(app => {
      if (!appMap.has(app.appId)) {
        appMap.set(app.appId, {
          id: app.id,
          appId: app.appId,
          displayName: app.displayName,
          secrets: [],
          certificates: []
        });
      }

      const existingApp = appMap.get(app.appId)!;
      existingApp.secrets.push(...this.processPasswordCredentials(app.passwordCredentials, 'application'));
      existingApp.certificates.push(...this.processKeyCredentials(app.keyCredentials, 'application'));
    });

    const result = Array.from(appMap.values());
    console.log(`Processed ${result.length} unique applications`);

    return result;
  }

  async getApplicationsExpiringInDays(days: number[]): Promise<ApplicationWithSecrets[]> {
    const allApps = await this.getAllApplicationsWithSecrets();

    return allApps.filter(app => {
      const expiringSoonSecrets = app.secrets.filter(secret =>
        days.includes(secret.daysUntilExpiration) || secret.isExpired
      );

      const expiringSoonCerts = app.certificates.filter(cert =>
        days.includes(cert.daysUntilExpiration) || cert.isExpired
      );

      return expiringSoonSecrets.length > 0 || expiringSoonCerts.length > 0;
    }).map(app => ({
      ...app,
      secrets: app.secrets.filter(secret =>
        days.includes(secret.daysUntilExpiration) || secret.isExpired
      ),
      certificates: app.certificates.filter(cert =>
        days.includes(cert.daysUntilExpiration) || cert.isExpired
      )
    }));
  }
}