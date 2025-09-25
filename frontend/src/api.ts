import { useQuery } from '@tanstack/react-query';
import type { ApplicationsResponse, Application } from './types';

// Mock API base URL - replace with your actual API endpoint
const API_BASE_URL = 'https://api.example.com';

// API functions
export const fetchApplications = async (): Promise<Application[]> => {
  // Mock data for development - replace with actual API call
  const mockData: Application[] = [
    {
      id: 'app-1',
      name: 'Production API',
      credentials: [
        {
          id: 'cred-1',
          name: 'prod-api-key',
          keyId: 'ak_prod_123456',
          expiresAt: '2024-12-15T00:00:00Z',
          applicationId: 'app-1'
        }
      ]
    },
    {
      id: 'app-2',
      name: 'Mobile App Backend',
      credentials: [
        {
          id: 'cred-2',
          name: 'mobile-secret',
          keyId: 'ms_mobile_789012',
          expiresAt: '2024-10-05T00:00:00Z',
          applicationId: 'app-2'
        }
      ]
    },
    {
      id: 'app-3',
      name: 'Analytics Service',
      credentials: [
        {
          id: 'cred-3',
          name: 'analytics-token',
          keyId: 'at_analytics_345678',
          expiresAt: '2024-11-20T00:00:00Z',
          applicationId: 'app-3'
        }
      ]
    },
    {
      id: 'app-4',
      name: 'Payment Gateway',
      credentials: [
        {
          id: 'cred-4',
          name: 'payment-key',
          keyId: 'pk_payment_901234',
          expiresAt: '2024-09-28T00:00:00Z',
          applicationId: 'app-4'
        }
      ]
    },
    {
      id: 'app-5',
      name: 'Email Service',
      credentials: [
        {
          id: 'cred-5',
          name: 'email-api-key',
          keyId: 'eak_email_567890',
          expiresAt: '2025-01-15T00:00:00Z',
          applicationId: 'app-5'
        }
      ]
    }
  ];

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return mockData;

  // Uncomment this for real API usage:
  /*
  const response = await fetch(`${API_BASE_URL}/applications`);
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  const data: ApplicationsResponse = await response.json();
  return data.applications;
  */
};

// React Query hooks
export const useApplications = () => {
  return useQuery({
    queryKey: ['applications'],
    queryFn: fetchApplications,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
  });
};