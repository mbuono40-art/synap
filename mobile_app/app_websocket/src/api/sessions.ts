import { CONFIG } from '../config';
import { Session } from '../types';
import { authApi } from './auth';

const getHeaders = async () => {
  const token = await authApi.getToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const sessionsApi = {
  getSessions: async (): Promise<Session[]> => {
    const headers = await getHeaders();
    const response = await fetch(`${CONFIG.API_URL}/sessions`, { headers });
    if (!response.ok) throw new Error('Failed to fetch sessions');
    return response.json();
  },
  
  startSession: async (patientId: string): Promise<Session> => {
    const headers = await getHeaders();
    const response = await fetch(`${CONFIG.API_URL}/sessions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ patient_id: patientId }),
    });
    if (!response.ok) throw new Error('Failed to start session');
    return response.json();
  },
  
  stopSession: async (sessionId: string): Promise<Session> => {
    const headers = await getHeaders();
    const response = await fetch(`${CONFIG.API_URL}/sessions/${sessionId}/stop`, {
      method: 'PUT',
      headers,
    });
    if (!response.ok) throw new Error('Failed to stop session');
    return response.json();
  }
};
