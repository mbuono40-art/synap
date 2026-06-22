# IoMT Lab - Progetto Riabilitazione Synap

Benvenuti nel progetto Synap! Questo repository contiene l'intera infrastruttura per il sistema di riabilitazione intelligente (IoMT).

## Architettura del Progetto
L'infrastruttura si basa su un ecosistema Dockerizzato composto da:
- **Backend (FastAPI)**: Gestisce l'autenticazione, il database locale (SQLite) e smista i dati tramite WebSocket in tempo reale.
- **Mosquitto (MQTT)**: Il broker a cui si connettono i sensori hardware (ESP32) per inviare i dati in tempo reale.
- **InfluxDB**: Database Time-Series ad altissime prestazioni per salvare lo storico dei segnali dei sensori (ECG, FSR, EMG, Accel).
- **Grafana**: Dashboard analitica per medici/admin, pre-collegata a InfluxDB e al database locale.
- **Node-RED**: Motore a blocchi per elaborazioni IoT (es. regole di allerta, trigger).
- **Mobile App (React Native/Expo)**: L'app lato paziente per gli esercizi di riabilitazione in tempo reale.

## 🛠 Prerequisiti
Per far girare questo progetto sul tuo computer, hai bisogno di:
1. **Docker Desktop** (o Docker Compose)
2. **Node.js** (versione 18 o superiore)
3. **Python 3.10+** (opzionale, utile per sviluppare script in locale)

---

## 🚀 Setup Iniziale (Solo la prima volta)

Poiché file sensibili come chiavi e variabili d'ambiente non sono su GitHub, devi creare un file `.env` locale.

1. Crea un file chiamato `.env` nella cartella principale del progetto e copianci dentro il contenuto di `.env.example` (se presente) oppure configura le tue variabili:
```env
# Esempio .env locale
MQTT_HOST=mosquitto
INFLUXDB_URL=http://influxdb:8086
INFLUXDB_TOKEN=synap_super_secret_token_123
```

2. Avvia l'infrastruttura backend (Server, Database, MQTT):
```bash
docker-compose up -d --build
```
> Il flag `-d` avvia i contenitori in background. Ci vorrà un po' per scaricare le immagini la prima volta.

---

## 📱 Avvio dell'App Mobile (Frontend)

L'App Mobile (React Native) non viene gestita dal docker-compose per comodità di sviluppo live-reload. Devi avviarla separatamente.

1. Entra nella cartella dell'app:
```bash
cd mobile_app/app_websocket
```

2. Installa le dipendenze:
```bash
npm install
```

3. Modifica l'IP nel file `src/config.ts` se stai testando su un telefono fisico, inserendo l'IP locale del tuo computer (es. `192.168.1.55`). Se usi un emulatore sul computer, lascia `localhost`.

4. Avvia l'app tramite Expo:
```bash
npm start
```
> Si aprirà un QR Code nel terminale: puoi scansionarlo con l'app "Expo Go" dal tuo smartphone.

---

## 🧪 Testare il Sistema (Simulatore Dati)

Dato che probabilmente non hai l'hardware ESP32 attaccato al braccio mentre scrivi codice, abbiamo creato uno script che simula i dati in tempo reale sparandoli dentro Mosquitto.

Apri un altro terminale nella cartella principale ed esegui:
```bash
./simulate_data.sh 1
```
*(Il numero "1" è l'ID del paziente fittizio. Se l'app mobile è loggata con l'utente ID 1, vedrai le animazioni muoversi in tempo reale sull'App).*

---

## 🧭 Servizi in Ascolto
Quando `docker-compose up` è in esecuzione, puoi accedere a:
- **FastAPI (Swagger API)**: `http://localhost:8000/docs`
- **Grafana (Admin)**: `http://localhost:3000` (User/Pass di base: admin/admin)
- **InfluxDB**: `http://localhost:8086`
- **Node-RED**: `http://localhost:1880`

## ⚠️ Avvertenze per i Colleghi (Git)
Abbiamo inserito un `.gitignore` rigoroso per evitare disastri di merge.
- **I Database** (`*.db`, `/influxdb/data`, `/mosquitto/data`, `/grafana/data`) **non verranno mai caricati su Git**. Ciascuno avrà i propri dati di test in locale.
- Se create una nuova dashboard su Grafana e volete condividerla, esportate il file JSON e mettetelo manualmente nella repository!
- Non caricare mai file che contengono credenziali Firebase o chiavi API.
