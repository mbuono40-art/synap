import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useWebSocket } from '../hooks/useWebSocket';
import { sessionsApi } from '../api/sessions';
import { exercisesApi } from '../api/exercises';
import { Session } from '../types';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

export default function PatientDashboard() {
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [patientId, setPatientId] = useState<number | null>(null);
  const [patientName, setPatientName] = useState('Paziente');
  const [exerciseLogs, setExerciseLogs] = useState<any[]>([]);
  const { data, isConnected } = useWebSocket(currentSession?.id, patientId);
  const [sessionTime, setSessionTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { authApi } = await import('../api/auth');
        const token = await authApi.getToken();
        const { CONFIG } = await import('../config');
        const response = await fetch(`${CONFIG.API_URL}/users/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const user = await response.json();
          setPatientId(user.id);
          if (user.first_name) setPatientName(user.first_name);
        }
      } catch (e) {
        console.error("Failed to fetch user", e);
      }
    };
    fetchUser();
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const logs = await exercisesApi.getExerciseLogs();
      setExerciseLogs(logs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (currentSession) {
      setSessionTime(0);
      timerRef.current = setInterval(() => {
        setSessionTime((prev) => prev + 1);
      }, 1000);
      
      // Start pulsing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
        ])
      ).start();

    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentSession]);

  const handleStartSession = async () => {
    if (!patientId) return;
    try {
      const session = await sessionsApi.startSession(patientId.toString());
      setCurrentSession(session);
    } catch (e) {
      console.error("Error starting session:", e);
    }
  };

  const handleStopSession = async () => {
    if (!currentSession) return;
    try {
      await sessionsApi.stopSession(currentSession.id);
      setCurrentSession(null);
    } catch (e) {
      console.error(e);
      setCurrentSession(null);
    }
  };

  const latestData = data.length > 0 ? data[data.length - 1] : { fsr: 0, emg: 0 };
  
  // Calculate progress for exercises (0 to 100%)
  const fsrProgress = Math.min(100, Math.max(0, (latestData.fsr / 250) * 100)); // Assuming max grip is ~250
  const emgProgress = Math.min(100, Math.max(0, (latestData.emg / 100) * 100)); // Assuming max EMG is ~100

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Ciao, {patientName}</Text>
          <Text style={styles.headerSubtitle}>Il tuo piano di riabilitazione</Text>
        </View>
        {/* Subtle Online/Offline Indicator */}
        <View style={styles.statusIconContainer}>
          <Ionicons 
            name={isConnected ? "wifi" : "wifi-outline"} 
            size={24} 
            color={isConnected ? "#4caf50" : "#999"} 
          />
        </View>
      </View>

      {/* Main Action Button */}
      <View style={styles.mainActionContainer}>
        {!currentSession ? (
          <TouchableOpacity activeOpacity={0.8} onPress={handleStartSession} style={styles.actionButtonWrapper}>
            <LinearGradient colors={['#4c669f', '#3b5998', '#192f6a']} style={styles.gradientButton}>
              <Ionicons name="play" size={32} color="white" style={styles.actionIcon} />
              <View>
                <Text style={styles.actionButtonTitle}>INIZIA SESSIONE</Text>
                <Text style={styles.actionButtonSub}>Premi qui per avviare il tracciamento</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity activeOpacity={0.8} onPress={handleStopSession} style={styles.actionButtonWrapper}>
            <LinearGradient colors={['#e53935', '#c62828']} style={styles.gradientButton}>
              <Ionicons name="stop" size={32} color="white" style={styles.actionIcon} />
              <View>
                <Text style={styles.actionButtonTitle}>TERMINA SESSIONE</Text>
                <Text style={styles.actionButtonSub}>Durata: {formatTime(sessionTime)}</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      {/* Progress Chart Section (Visible when no active session) */}
      {!currentSession && (
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <View style={styles.exerciseCard}>
            <Text style={styles.sectionTitle}>I Tuoi Progressi</Text>
            <Text style={{color: '#666', marginBottom: 15, fontSize: 13}}>Miglioramento della precisione nel tempo</Text>
            
            {exerciseLogs.length > 0 ? (
              <LineChart
                data={{
                  labels: exerciseLogs.slice(0, 5).reverse().map(l => new Date(l.timestamp).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })),
                  datasets: [{
                    data: exerciseLogs.slice(0, 5).reverse().map(l => l.score)
                  }]
                }}
                width={Dimensions.get('window').width - 80}
                height={220}
                yAxisSuffix="%"
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(59, 89, 152, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: { borderRadius: 16 },
                  propsForDots: { r: "6", strokeWidth: "2", stroke: "#ffa726" }
                }}
                bezier
                style={{ marginVertical: 8, borderRadius: 16 }}
              />
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Ionicons name="stats-chart-outline" size={40} color="#ccc" />
                <Text style={{ color: '#888', marginTop: 10, textAlign: 'center', fontSize: 13 }}>
                  Completa il tuo primo esercizio di riabilitazione per sbloccare il grafico!
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Live Exercises Section - Only visible during session */}
      {currentSession && (
        <Animated.View style={[styles.activeSessionArea, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="fitness-outline" size={24} color="#3b5998" />
            <Text style={styles.sectionTitle}>Esercizi in Tempo Reale</Text>
          </View>

          {/* Esercizio 1: Forza Presa */}
          <View style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <MaterialCommunityIcons name="hand-back-right" size={24} color="#ff9800" />
                <Text style={styles.exerciseName}>Esercizio Mano (Presa)</Text>
              </View>
              <Text style={styles.exerciseValue}>{latestData.fsr.toFixed(0)} N</Text>
            </View>
            <Text style={styles.exerciseHint}>Stringi la mano il più forte possibile</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${fsrProgress}%`, backgroundColor: '#ff9800' }]} />
            </View>
          </View>

          {/* Esercizio 2: Contrazione Bicipite/Polso (EMG) */}
          <View style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <MaterialCommunityIcons name="arm-flex" size={24} color="#9c27b0" />
                <Text style={styles.exerciseName}>Esercizio Braccio/Polso</Text>
              </View>
              <Text style={styles.exerciseValue}>{latestData.emg.toFixed(0)} %</Text>
            </View>
            <Text style={styles.exerciseHint}>Fletti il polso o contrai il braccio</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${emgProgress}%`, backgroundColor: '#9c27b0' }]} />
            </View>
          </View>
        </Animated.View>
      )}



      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: 50, 
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  greeting: { fontSize: 26, fontWeight: '800', color: '#1a1a1a' },
  headerSubtitle: { fontSize: 15, color: '#666', marginTop: 4, fontWeight: '500' },
  statusIconContainer: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 20,
  },
  mainActionContainer: {
    padding: 20,
    marginTop: 10,
  },
  actionButtonWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderRadius: 20,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
  },
  actionIcon: {
    marginRight: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 12,
    borderRadius: 15,
  },
  actionButtonTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
  },
  actionButtonSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 4,
  },
  activeSessionArea: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  exerciseCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginLeft: 10,
  },
  exerciseValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  exerciseHint: {
    fontSize: 13,
    color: '#888',
    marginTop: 8,
    marginBottom: 15,
    fontStyle: 'italic',
  },
  progressBarBg: {
    height: 12,
    backgroundColor: '#eee',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 30,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 15,
  },
  emptyStateSubText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  }
});
