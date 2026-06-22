import { CONFIG } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';

export const authApi = {
  login: async (email: string, password: string): Promise<{ access_token: string; user: User }> => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await fetch(`${CONFIG.API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });
    
    if (!response.ok) {
      throw new Error('Login failed');
    }
    
    const data = await response.json();
    await AsyncStorage.setItem('access_token', data.access_token);
    return data;
  },
  
  logout: async () => {
    await AsyncStorage.removeItem('access_token');
  },
  
  getToken: async () => {
    return await AsyncStorage.getItem('access_token');
  }
};
