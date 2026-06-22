import { useEffect, useState, useRef } from 'react';
import { CONFIG } from '../config';
import { SensorData } from '../types';
import { authApi } from '../api/auth';

export const useWebSocket = (sessionId?: string, currentPatientId?: number | null) => {
  const [data, setData] = useState<SensorData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!sessionId || !currentPatientId) return;

    const connect = async () => {
      const token = await authApi.getToken();
      if (!token) return;

      const wsUrl = `${CONFIG.WS_URL}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const incoming = JSON.parse(event.data);
          
          // CRITICAL: Filter data for the current patient only!
          // incoming.patient_id is usually formatted as "patient_1", so we extract the number or compare accordingly
          const incomingId = incoming.patient_id.replace('patient_', '');
          if (parseInt(incomingId) !== currentPatientId) {
            return; // Ignore data belonging to other patients
          }
          
          setData((prev) => {
            const lastEntry = prev.length > 0 ? prev[prev.length - 1] : { timestamp: new Date().toISOString(), ecg: 0, fsr: 0, emg: 0, accel_z: 0 };
            
            const newEntry: SensorData = {
              ...lastEntry,
              timestamp: new Date().toISOString()
            };
            
            if (incoming.sensor_type === 'fsr') {
              newEntry.fsr = incoming.value;
            } else if (incoming.sensor_type === 'emg') {
              newEntry.emg = incoming.value;
            } else if (incoming.sensor_type === 'ecg') {
              newEntry.ecg = incoming.value;
            } else if (incoming.sensor_type === 'accel_z') {
              newEntry.accel_z = incoming.value;
            }

            const newData = [...prev, newEntry];
            // Keep last 50 data points for performance
            if (newData.length > 50) return newData.slice(newData.length - 50);
            return newData;
          });
        } catch (e) {
          console.error('Error parsing WS data', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
      };

      wsRef.current = ws;
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [sessionId, currentPatientId]);

  return { data, isConnected };
};
