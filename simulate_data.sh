#!/bin/bash

# ID del paziente di default è 1, ma puoi passarlo come argomento (es: ./simulate_data.sh 2)
PATIENT_ID=${1:-1}

echo "================================================="
echo " Simulazione Dati Sensori per Paziente: $PATIENT_ID "
echo " Premi [Ctrl+C] per fermare la simulazione"
echo "================================================="

# Ciclo infinito
while true; do
  # Simula ECG (valori realistici tra 80 e 150 per simulare il tracciato)
  ECG_VAL=$((80 + RANDOM % 70))
  
  # Simula FSR (Forza di presa, valori tra 10 e 250)
  FSR_VAL=$((10 + RANDOM % 240))
  
  # Simula EMG (Attività muscolare, valori tra 0 e 220 per raggiungere gli obiettivi)
  EMG_VAL=$((RANDOM % 220))
  
  # Simula Accelerometro Z (Angolo/Elevazione del braccio, valori tra 0 e 90 gradi)
  ACCEL_Z=$((RANDOM % 90))

  # Invia i dati tramite MQTT al container Mosquitto
  docker exec mosquitto mosquitto_pub -h localhost -t synap/patient_${PATIENT_ID}/ecg -m "$ECG_VAL"
  docker exec mosquitto mosquitto_pub -h localhost -t synap/patient_${PATIENT_ID}/fsr -m "$FSR_VAL"
  docker exec mosquitto mosquitto_pub -h localhost -t synap/patient_${PATIENT_ID}/emg -m "$EMG_VAL"
  docker exec mosquitto mosquitto_pub -h localhost -t synap/patient_${PATIENT_ID}/accel_z -m "$ACCEL_Z"

  echo "Inviato -> ECG: $ECG_VAL mV | FSR: $FSR_VAL N | EMG: $EMG_VAL % | ACCEL_Z: $ACCEL_Z °"
  
  # Aspetta 1 secondo prima del prossimo invio (puoi ridurlo a 0.5 per più velocità)
  sleep 1
done
