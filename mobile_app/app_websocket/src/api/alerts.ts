import { CONFIG } from '../config';
import { Alert } from '../types';
import { authApi } from './auth';

export const alertsApi = {
  getAlerts: async (): Promise<Alert[]> => {
    const token = await authApi.getToken();
    const response = await fetch(`${CONFIG.API_URL}/alerts`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('Failed to fetch alerts');
    return response.json();
  }
};
