import { IApplication } from "./hooks/apiClients/useApplicationsApi";

export interface Credential {
  id: string;
  name: string;
  keyId: string;
  expiresAt: string;
  applicationId: string;
}

export interface ApplicationWithStatus extends IApplication {
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