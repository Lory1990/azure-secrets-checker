export interface Credential {
  id: string;
  name: string;
  keyId: string;
  expiresAt: string;
  applicationId: string;
}

export interface Application {
  id: string;
  name: string;
  credentials: Credential[];
}

export interface ApplicationWithStatus extends Application {
  status: 'valid' | 'expiring' | 'expired';
  daysRemaining: number;
  nearestExpiration: string;
}

export interface PaginationInfo {
  page: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export interface ApplicationsResponse {
  applications: Application[];
  pagination?: PaginationInfo;
}