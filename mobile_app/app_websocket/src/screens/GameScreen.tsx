import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWebSocket } from '../hooks/useWebSocket';
import { exercisesApi } from '../api/exercises';

type GameState = 'idle' | 'calibrating' | 'resting' | 'contracting' | 'finished';

const REPS_COUNT = 5;
const CONTRACT_TIME = 5;
const REST_TIME = 3;
const CALIBRATE_TIME = 3;

export default function GameScreen() {
  const [patientId, setPatientId] = useState<number | null>(null);
  const { data, isConnected } = useWebSocket('session_game', patientId);
  const [exerciseType, setExerciseType] = useState<'FSR' | 'EMG'>('FSR');
  
  // Clinical Protocol States
  const [gameState, setGameState] = useState<GameState>('idle');
  const [timeLeft, setTimeLeft] = useState(0);
  const [mvc, setMvc] = useState(0); // Maximum Voluntary Contraction
  const [repsLeft, setRepsLeft] = useState(REPS_COUNT);
  
  // Scoring
  const [samplesInZone, setSamplesInZone] = useState(0);
  const [totalSamples, setTotalSamples] = useState(0);

  // Animations
  const [ballScale] = useState(new Animated.Value(1));
  const [armPosition] = useState(new Animated.Value(0));

  const latestData = data.length > 0 ? data[data.length - 1] : { fsr: 0, emg: 0 };
  const currentValue = exerciseType === 'FSR' ? latestData.fsr : latestData.emg;
  
  // Target and margin
  const targetValue = mvc * 0.7; // Target is 70% of MVC
  const margin = targetValue * 0.15; // +/- 15% tolerance

  const isInZone = currentValue >= Math.max(0, targetValue - margin) && currentValue <= targetValue + margin;

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
        }
      } catch (e) {
        console.error("Failed to fetch user", e);
      }
    };
    fetchUser();
  }, []);

  // Timer logic for State Machine
  useEffect(() => {
    if (gameState === 'idle' || gameState === 'finished') return;

    const timerId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleStateTransition();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [gameState, repsLeft]);

  // Real-time data processing
  useEffect(() => {
    if (gameState === 'calibrating') {
      if (currentValue > mvc) setMvc(currentValue);
    } else if (gameState === 'contracting') {
      setTotalSamples((prev) => prev + 1);
      if (isInZone) {
        setSamplesInZone((prev) => prev + 1);
      }
    }

    // Update animations
    if (exerciseType === 'FSR') {
      // Limit ball scale to prevent covering text
      const targetScale = mvc > 0 ? 1 + (targetValue / mvc) : 1;
      const scaleTarget = mvc > 0 ? 1 + (currentValue / mvc) : 1 + (currentValue / 100);
      const maxAllowedScale = Math.max(targetScale * 1.1, 1.5);
      
      Animated.spring(ballScale, {
        toValue: Math.min(Math.max(scaleTarget, 1), maxAllowedScale),
        useNativeDriver: true,
        friction: 3,
      }).start();
    } else {
      Animated.spring(armPosition, {
        toValue: currentValue,
        useNativeDriver: false,
        friction: 5,
        tension: 40,
        overshootClamping: true,
      }).start();
    }
  }, [latestData.fsr, latestData.emg]);

  const handleStateTransition = () => {
    if (gameState === 'calibrating') {
      setGameState('resting');
      setTimeLeft(REST_TIME);
    } else if (gameState === 'resting') {
      setGameState('contracting');
      setTimeLeft(CONTRACT_TIME);
    } else if (gameState === 'contracting') {
      if (repsLeft - 1 > 0) {
        setRepsLeft((prev) => prev - 1);
        setGameState('resting');
        setTimeLeft(REST_TIME);
      } else {
        finishExercise();
      }
    }
  };

  const startExercise = () => {
    setMvc(0);
    setSamplesInZone(0);
    setTotalSamples(0);
    setRepsLeft(REPS_COUNT);
    setGameState('calibrating');
    setTimeLeft(CALIBRATE_TIME);
  };

  const finishExercise = async () => {
    setGameState('finished');
    const finalScore = totalSamples > 0 ? Math.round((samplesInZone / totalSamples) * 100) : 0;
    
    try {
      await exercisesApi.saveExerciseLog({
        exercise_type: exerciseType,
        score: finalScore,
        max_contraction: Math.round(mvc),
        duration: REPS_COUNT * CONTRACT_TIME
      });
      Alert.alert(
        "Ottimo lavoro! 🏆", 
        `Hai mantenuto il livello di contrazione ideale per il ${finalScore}% del tempo.\n\nIl tuo risultato è stato salvato nel profilo.`
      );
    } catch (e) {
      console.error(e);
      Alert.alert("Errore", "Impossibile salvare il punteggio, riprova più tardi.");
    }
  };

  const renderVisualizer = () => {
    if (exerciseType === 'FSR') {
      // Logica pallina
      const targetScale = mvc > 0 ? 1 + (targetValue / mvc) : 1;
      const marginScale = mvc > 0 ? (margin / mvc) : 0;
      const ringSize = 100 * targetScale; // base size is 100
      const ringThickness = Math.max(100 * marginScale, 10); // visual thickness for the green zone

      return (
        <View style={styles.fsrArea}>
          {/* Target Ring */}
          {gameState !== 'idle' && gameState !== 'calibrating' && (
            <View style={[
              styles.targetRing, 
              { 
                width: ringSize, 
                height: ringSize, 
                borderRadius: ringSize / 2,
                borderWidth: ringThickness / 2
              }
            ]} />
          )}

          <Animated.View 
            style={[
              styles.ball, 
              { transform: [{ scale: ballScale }] },
              (gameState === 'contracting' && isInZone) ? styles.successColor : null
            ]} 
          >
            <Ionicons name="hand-right" size={30} color="white" />
          </Animated.View>
        </View>
      );
    } else {
      // Logica slider EMG
      const maxScale = 300; // Approximated max values
      const targetPercent = Math.min((targetValue / maxScale) * 100, 85);
      const marginPercent = Math.min((margin / maxScale) * 100, 20);
      const currentPercent = armPosition.interpolate({
        inputRange: [0, maxScale],
        outputRange: ['0%', '85%'],
        extrapolate: 'clamp'
      });

      return (
        <View style={styles.emgArea}>
          <View style={styles.emgTrack}>
            {/* Target Zone Box */}
            {gameState !== 'idle' && gameState !== 'calibrating' && (
              <View style={[
                styles.emgTargetZone, 
                { bottom: `${Math.max(0, targetPercent - marginPercent)}%`, height: `${marginPercent * 2}%` }
              ]} />
            )}
            
            {/* Target Line */}
            {gameState !== 'idle' && gameState !== 'calibrating' && (
              <View style={[styles.emgTargetLine, { bottom: `${targetPercent}%` }]} />
            )}

            {/* Moving Cursor */}
            <Animated.View 
              style={[
                styles.emgCursor,
                { bottom: currentPercent },
                (gameState === 'contracting' && isInZone) ? styles.successColor : null
              ]} 
            >
              <Ionicons name="fitness" size={28} color="white" />
            </Animated.View>
          </View>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Riabilitazione</Text>
          <Text style={styles.headerSubtitle}>
            Score Precisione: <Text style={styles.scoreHighlight}>
              {totalSamples > 0 ? Math.round((samplesInZone / totalSamples) * 100) : 0}%
            </Text>
          </Text>
        </View>
        <View style={styles.connectionBadge}>
          <View style={[styles.dot, { backgroundColor: isConnected ? '#4caf50' : '#f44336' }]} />
          <Text style={styles.connectionText}>{isConnected ? 'Online' : 'Offline'}</Text>
        </View>
      </View>

      <View style={styles.toggleContainer}>
        <TouchableOpacity 
          style={[styles.toggleButton, exerciseType === 'FSR' && styles.toggleButtonActive]}
          onPress={() => (gameState === 'idle' || gameState === 'finished') && setExerciseType('FSR')}
          disabled={gameState !== 'idle' && gameState !== 'finished'}
        >
          <Ionicons name="hand-right" size={20} color={exerciseType === 'FSR' ? 'white' : '#666'} />
          <Text style={[styles.toggleText, exerciseType === 'FSR' && styles.toggleTextActive]}>Presa</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.toggleButton, exerciseType === 'EMG' && styles.toggleButtonActive]}
          onPress={() => (gameState === 'idle' || gameState === 'finished') && setExerciseType('EMG')}
          disabled={gameState !== 'idle' && gameState !== 'finished'}
        >
          <Ionicons name="fitness" size={20} color={exerciseType === 'EMG' ? 'white' : '#666'} />
          <Text style={[styles.toggleText, exerciseType === 'EMG' && styles.toggleTextActive]}>Braccio</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.gameCard}>
        {gameState === 'idle' || gameState === 'finished' ? (
          <View style={styles.centerBox}>
            <View style={styles.iconCircle}>
              <Ionicons name={exerciseType === 'FSR' ? "hand-right" : "fitness"} size={50} color="#3b5998" />
            </View>
            <Text style={styles.instructionsTitle}>Inizia l'Esercizio</Text>
            <Text style={styles.instructions}>
              {exerciseType === 'FSR' 
                ? "Calibra la forza di presa massima per 3 secondi. Poi fai gonfiare la pallina fino a raggiungere e mantenere l'anello verde target!"
                : "Calibra la contrazione massima per 3 secondi. Poi mantieni il cursore dello slider all'interno della zona verde target!"}
            </Text>
            <TouchableOpacity style={styles.startButton} onPress={startExercise}>
              <Text style={styles.startButtonText}>INIZIA SESSIONE</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.activeProtocolBox}>
            <View style={styles.statusHeader}>
              <Text style={styles.repsText}>Round: {REPS_COUNT - repsLeft + 1}/{REPS_COUNT}</Text>
              <Text style={styles.timerText}>{timeLeft}s</Text>
            </View>

            {gameState === 'calibrating' && (
              <Text style={[styles.stateTitle, { color: '#d32f2f' }]}>🔥 DAI IL MASSIMO! Stringi forte!</Text>
            )}
            {gameState === 'resting' && (
              <Text style={[styles.stateTitle, { color: '#2196f3' }]}>🧘 RIPOSO: Rilassa completamente</Text>
            )}
            {gameState === 'contracting' && (
              <Text style={[styles.stateTitle, { color: '#4caf50' }]}>🟢 LAVORO: Mantieni nella zona verde!</Text>
            )}

            <View style={styles.targetContainer}>
              <View style={styles.valBox}>
                <Text style={styles.valLabel}>MVC</Text>
                <Text style={styles.valNumber}>{mvc.toFixed(0)}</Text>
              </View>
              <View style={styles.valBox}>
                <Text style={styles.valLabel}>Target</Text>
                <Text style={[styles.valNumber, { color: '#e65100' }]}>
                  {gameState === 'calibrating' ? '-' : targetValue.toFixed(0)}
                </Text>
              </View>
              <View style={styles.valBox}>
                <Text style={styles.valLabel}>Attuale</Text>
                <Text style={styles.valNumber}>{currentValue.toFixed(0)}</Text>
              </View>
            </View>

            {renderVisualizer()}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5', padding: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a' },
  headerSubtitle: { fontSize: 16, color: '#666', marginTop: 4 },
  scoreHighlight: { color: '#ff9800', fontWeight: 'bold', fontSize: 18 },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  connectionText: { fontSize: 12, fontWeight: '600', color: '#333' },
  
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 5,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  toggleButtonActive: {
    backgroundColor: '#3b5998',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 8,
  },
  toggleTextActive: {
    color: 'white',
  },

  gameCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10 },
  activeProtocolBox: { flex: 1, alignItems: 'center' },
  
  iconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#e8eaf6', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  instructionsTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 15, textAlign: 'center' },
  instructions: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 40, lineHeight: 24 },
  
  startButton: { backgroundColor: '#ff9800', paddingHorizontal: 40, paddingVertical: 15, borderRadius: 30, shadowColor: '#ff9800', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 5, elevation: 5 },
  startButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },

  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 15 },
  repsText: { fontSize: 18, fontWeight: 'bold', color: '#666' },
  timerText: { fontSize: 24, fontWeight: 'bold', color: '#d32f2f' },
  
  stateTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 20, textAlign: 'center' },

  targetContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: '#fff3e0',
    paddingVertical: 15,
    borderRadius: 15,
    marginBottom: 20,
  },
  valBox: { alignItems: 'center' },
  valLabel: { fontSize: 14, color: '#666', fontWeight: '600', marginBottom: 5 },
  valNumber: { fontSize: 24, fontWeight: 'bold', color: '#333' },

  fsrArea: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
  ball: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#2196f3', alignItems: 'center', justifyContent: 'center', shadowColor: '#2196f3', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 5, position: 'absolute' },
  targetRing: { position: 'absolute', borderColor: 'rgba(76, 175, 80, 0.4)', borderStyle: 'dashed' },
  
  emgArea: { flex: 1, width: '100%', alignItems: 'center', paddingBottom: 20 },
  emgTrack: { width: 60, height: '100%', backgroundColor: '#f0f2f5', borderRadius: 30, alignItems: 'center' },
  emgTargetZone: { position: 'absolute', width: 60, backgroundColor: 'rgba(76, 175, 80, 0.2)', zIndex: 0 },
  emgTargetLine: { position: 'absolute', width: 80, height: 4, backgroundColor: '#e65100', borderRadius: 2, zIndex: 0 },
  emgCursor: { position: 'absolute', width: 50, height: 50, borderRadius: 25, backgroundColor: '#9c27b0', alignItems: 'center', justifyContent: 'center', zIndex: 1, shadowColor: '#9c27b0', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5 },

  successColor: { backgroundColor: '#4caf50', shadowColor: '#4caf50' },
});
