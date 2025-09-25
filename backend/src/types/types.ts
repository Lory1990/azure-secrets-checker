export interface AzureTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface PasswordCredential {
  customKeyIdentifier?: string;
  displayName?: string;
  endDateTime: string;
  hint?: string;
  keyId: string;
  secretText?: string;
  startDateTime: string;
}

export interface KeyCredential {
  customKeyIdentifier?: string;
  displayName?: string;
  endDateTime: string;
  key?: string;
  keyId: string;
  startDateTime: string;
  type: string;
  usage: string;
}

export interface ServicePrincipal {
  id: string;
  appId: string;
  displayName: string;
  passwordCredentials: PasswordCredential[];
  keyCredentials: KeyCredential[];
}

export interface Application {
  id: string;
  appId: string;
  displayName: string;
  passwordCredentials: PasswordCredential[];
  keyCredentials: KeyCredential[];
}

export interface ApplicationWithSecrets {
  id: string;
  appId: string;
  displayName: string;
  secrets: SecretInfo[];
  certificates: CertificateInfo[];
  type?: 'servicePrincipal' | 'application';
}

export interface SecretInfo {
  keyId: string;
  displayName?: string;
  endDateTime: string;
  daysUntilExpiration: number;
  isExpired: boolean;
  source: 'servicePrincipal' | 'application';
}

export interface CertificateInfo {
  keyId: string;
  displayName?: string;
  endDateTime: string;
  daysUntilExpiration: number;
  isExpired: boolean;
  type: string;
  usage: string;
  source: 'servicePrincipal' | 'application';
}

export interface MailConfig {
  to: string;
  from: string;
  smtp?: {
    secure: boolean;
    host: string;
    port: number;
    user: string;
    pass: string;
  };
  acs?: {
    endpoint: string;
    key?: string;
  };
}

export interface ExpirationNotification {
  appName: string;
  appId: string;
  secrets: Array<{
    type: 'secret' | 'certificate';
    displayName?: string;
    endDateTime: string;
    daysUntilExpiration: number;
    isExpired: boolean;
  }>;
}

export type NotificationThreshold = 15 | 10 | 5 | 4 | 3 | 2 | 1 | 0;