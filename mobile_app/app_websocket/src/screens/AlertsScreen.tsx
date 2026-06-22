import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { alertsApi } from '../api/alerts';
import { Alert as AlertType } from '../types';

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const data = await alertsApi.getAlerts();
      setAlerts(data);
    } catch (e) {
      console.error(e);
      // Mock data for demo
      setAlerts([
        { id: '1', patient_id: 'patient_1', severity: 'high', message: 'High heart rate detected', timestamp: new Date().toISOString() },
        { id: '2', patient_id: 'patient_1', severity: 'medium', message: 'Irregular ECG pattern', timestamp: new Date(Date.now() - 3600000).toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#d32f2f';
      case 'high': return '#f57c00';
      case 'medium': return '#fbc02d';
      case 'low': return '#388e3c';
      default: return '#757575';
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Recent Alerts</Text>
      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.alertCard}>
            <View style={[styles.severityIndicator, { backgroundColor: getSeverityColor(item.severity) }]} />
            <View style={styles.alertContent}>
              <Text style={styles.alertMessage}>{item.message}</Text>
              <Text style={styles.alertTime}>{new Date(item.timestamp).toLocaleString()}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No alerts found.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  alertCard: { flexDirection: 'row', backgroundColor: '#fff', marginBottom: 15, borderRadius: 8, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },
  severityIndicator: { width: 8 },
  alertContent: { flex: 1, padding: 15 },
  alertMessage: { fontSize: 16, fontWeight: 'bold', marginBottom: 5, color: '#333' },
  alertTime: { fontSize: 12, color: '#666' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#666', fontSize: 16 }
});
