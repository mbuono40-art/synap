export interface User {
  id: string;
  email: string;
  role: string;
  name?: string;
}

export interface SensorData {
  timestamp: string;
  ecg: number;
  fsr: number;
  emg: number;
  accel_z: number;
}

export interface Alert {
  id: string;
  patient_id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  is_resolved?: boolean;
}

export interface Session {
  id: string;
  patient_id: string;
  start_time: string;
  end_time?: string;
  status: 'active' | 'completed' | 'paused';
}
