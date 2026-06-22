import { CONFIG } from '../config';
import { authApi } from './auth';

export const exercisesApi = {
  saveExerciseLog: async (log: { exercise_type: string, score: number, max_contraction: number, duration: number }) => {
    const token = await authApi.getToken();
    const response = await fetch(`${CONFIG.API_URL}/exercises/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(log)
    });
    if (!response.ok) throw new Error('Failed to save exercise log');
    return response.json();
  },

  getExerciseLogs: async () => {
    const token = await authApi.getToken();
    const response = await fetch(`${CONFIG.API_URL}/exercises/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('Failed to fetch exercise logs');
    return response.json();
  }
};
