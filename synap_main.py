from synap_classes import PatientMonitor

# --- CONFIGURAZIONE ---
SSID = "gabri"  
PASSWORD = "gabriella"     
BROKER_IP = "172.20.10.6"  
TOPIC_PUB = "biomed/dati"

if __name__ == "__main__":
    monitor = PatientMonitor(SSID, PASSWORD, BROKER_IP, TOPIC_PUB)
    monitor.start()
